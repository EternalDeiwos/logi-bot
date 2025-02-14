import { RabbitSubscribe } from '@golevelup/nestjs-rabbitmq';
import { Injectable, Logger } from '@nestjs/common';
import { parse } from 'csv-parse/sync';
import { ConsumeMessage } from 'amqplib';
import { flattenDepth, mapKeys, uniq } from 'lodash';
import { AccessMode, DiscordAPIInteraction } from 'src/types';
import { CatalogService } from 'src/game/catalog/catalog.service';
import { AccessService } from 'src/core/access/access.service';
import { AccessDecision } from 'src/core/access/access-decision';
import { SelectStockpileLogDto, StockpileLog } from './stockpile-log.entity';
import { InsertStockpileEntryDto, StockpileReportRecord } from './stockpile-entry.entity';
import { StockpileService } from './stockpile.service';
import { Stockpile } from './stockpile.entity';

// groups[stockpile][itemCode]
export type GroupedStockpileEntry = Record<string, Record<string, InsertStockpileEntryDto>>;

@Injectable()
export class StockpileUpdateConsumer {
  private readonly logger = new Logger(StockpileUpdateConsumer.name);

  constructor(
    private readonly accessService: AccessService,
    private readonly stockpileService: StockpileService,
    private readonly catalogService: CatalogService,
  ) {}

  @RabbitSubscribe({
    exchange: 'stockpile',
    routingKey: 'log.process',
    queue: 'stockpile-log-processing',
    queueOptions: {
      deadLetterExchange: 'errors',
    },
  })
  public async processStockpileUpdate(
    payload: SelectStockpileLogDto & { interaction: DiscordAPIInteraction },
    msg: ConsumeMessage,
  ) {
    const { interaction } = payload;
    const log = await this.stockpileService
      .queryLog()
      .byLog(payload)
      .withCrew()
      .withPoi()
      .withStockpiles()
      .withAccessRules()
      .getOneOrFail();

    const records = parse(log.raw, {
      columns: true,
      delimiter: '\t',
      relax_quotes: true,
    }) as StockpileReportRecord[];

    const codeName = uniq(records.map((r) => r.CodeName));
    const groups = await this.mergeRecords(records, log, codeName, interaction);
    const entries = await this.createEntries(groups, log);
    await this.stockpileService.updateStockpile(entries);
    await this.stockpileService.completeLogProcessing({ id: payload.id });

    this.logger.log(
      `Stockpile at the ${log.expandedLocation.getName()} updated by ${log.crew.name}`,
    );
  }

  private async createEntries(groups: GroupedStockpileEntry, log: StockpileLog) {
    const updateStockpileRefs = Object.keys(groups);
    const excludeCatalogByStockpile = Object.fromEntries(
      Object.entries(groups).map(([stockpileId, group]) => [stockpileId, Object.keys(group)]),
    );

    const ghosts = updateStockpileRefs.length
      ? await this.stockpileService
          .query()
          .byStockpile(updateStockpileRefs.map((id) => ({ id })))
          .withCurrentEntries()
          .withoutNilEntries()
          .withLogs()
          .withCatalog()
          .unsafe_excludeStockpileEntries(excludeCatalogByStockpile)
          .getMany()
      : [];

    return [
      // flatten groups into 1d array
      ...flattenDepth(
        Object.values(groups).map((group) => Object.values(group)),
        2,
      ),
      ...this.reconcileGhosts(ghosts, log),
    ];
  }

  private reconcileGhosts(ghosts: Stockpile[], log: StockpileLog): InsertStockpileEntryDto[] {
    const result: InsertStockpileEntryDto[] = [];

    for (const stockpile of ghosts) {
      for (const item of stockpile.currentItems) {
        this.logger.log(
          `${stockpile.name} at ${log.expandedLocation.getMajorName()}: Reduced to nil: ${item.expandedCatalog.displayName}`,
        );
        result.push({
          logId: log.id,
          guildId: log.guildId,
          createdBy: log.createdBy,
          warNumber: log.warNumber,
          catalogId: item.expandedCatalog.id,
          stockpileId: stockpile.id,
        });
      }
    }

    return result;
  }

  private async mergeRecords(
    records: StockpileReportRecord[],
    log: StockpileLog,
    codeName: string[],
    interaction: DiscordAPIInteraction,
  ): Promise<GroupedStockpileEntry> {
    const accessArgs = await this.accessService.getTestArgs(interaction);
    const items = await this.catalogService.query().byCodeName(codeName).getMany();
    const catalog = mapKeys(items, (r) => r.name);

    return records.reduce(
      (state, record) => {
        const stockpile = log.expandedLocation.stockpiles.find(
          (s) => s.name === record['Stockpile Name'],
        );

        if (!stockpile) {
          this.logger.warn(
            `Unable to process ${record.CodeName} for ${record['Stockpile Name']} at the ${log.expandedLocation.getName()}`,
          );
          return state;
        }

        if (
          !stockpile.access
            .filter((access) => access.access <= AccessMode.WRITE)
            .some((access) => AccessDecision.fromEntry(access.rule).permit(...accessArgs))
        ) {
          this.logger.warn(
            `Access control failed in processing ${record.CodeName} for ${record['Stockpile Name']} at the ${log.expandedLocation.getName()}`,
          );
          return state;
        }

        const item = catalog[record.CodeName];
        const isShippable = item.shippableMax > 0;
        const quantity = parseInt(record.Quantity);

        state[stockpile.id] = state[stockpile.id] || {};
        const entry =
          state[stockpile.id][record.CodeName] ||
          ({
            logId: log.id,
            guildId: log.guildId,
            createdBy: log.createdBy,
            warNumber: log.warNumber,
            catalogId: item.id,
            stockpileId: stockpile.id,
          } as InsertStockpileEntryDto);

        if (record['Crated?'] === 'true') {
          if (isShippable) {
            entry.quantityShippable = quantity;
          } else {
            entry.quantityCrated = quantity;
          }
        } else {
          entry.quantity = quantity;
        }

        state[stockpile.id][record.CodeName] = entry;

        return state;
      },
      {} as Record<string, Record<string, InsertStockpileEntryDto>>,
    );
  }
}
