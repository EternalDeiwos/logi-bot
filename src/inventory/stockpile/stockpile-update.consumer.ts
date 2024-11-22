import { RabbitSubscribe } from '@golevelup/nestjs-rabbitmq';
import { Injectable, Logger } from '@nestjs/common';
import { GuildManager } from 'discord.js';
import { parse } from 'csv-parse/sync';
import { ConsumeMessage } from 'amqplib';
import { flattenDepth, mapKeys, uniq } from 'lodash';
import { DiscordAPIInteraction } from 'src/types';
import { CatalogService } from 'src/game/catalog/catalog.service';
import { AccessService } from 'src/core/access/access.service';
import { SelectStockpileLog, StockpileLog } from './stockpile-log.entity';
import { InsertStockpileEntry, StockpileReportRecord } from './stockpile-entry.entity';
import { StockpileService } from './stockpile.service';
import { Stockpile } from './stockpile.entity';
import { AccessDecision } from 'src/core/access/access-decision';

@Injectable()
export class StockpileUpdateConsumer {
  private readonly logger = new Logger(StockpileUpdateConsumer.name);

  constructor(
    private readonly guildManager: GuildManager,
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
    payload: SelectStockpileLog & { interaction: DiscordAPIInteraction },
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
    // groups[stockpile][itemCode]
    const groups = await this.mergeRecords(records, log, codeName, interaction);
    const updateStockpileRefs = Object.keys(groups);
    const ghostsQuery = await this.stockpileService
      .query()
      .byStockpile(updateStockpileRefs.map((id) => ({ id })))
      .withCurrentEntries()
      .withoutNilEntries()
      .withLogs()
      .withCatalog();

    for (const [stockpileId, group] of Object.entries(groups)) {
      ghostsQuery.unsafe_excludeStockpileEntriesByCodeName(Object.keys(group), { id: stockpileId });
    }

    const ghosts = updateStockpileRefs.length ? await ghostsQuery.getMany() : [];
    const entries = [
      // flatten groups into 1d array
      ...flattenDepth(
        Object.values(groups).map((group) => Object.values(group)),
        2,
      ),
      ...this.reconcileGhosts(ghosts, log),
    ];

    await this.stockpileService.updateStockpile(entries);
    await this.stockpileService.completeLogProcessing({ id: payload.id });

    this.logger.log(
      `Stockpile at the ${log.expandedLocation.getName()} updated by ${log.crew.name}`,
    );
  }

  private reconcileGhosts(ghosts: Stockpile[], log: StockpileLog): InsertStockpileEntry[] {
    const result: InsertStockpileEntry[] = [];

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
  ): Promise<Record<string, Record<string, InsertStockpileEntry>>> {
    const guild = await this.guildManager.fetch(interaction.guildId);
    const member = await guild.members.fetch(interaction.member);
    const accessArgs = await this.accessService.getTestArgs({
      guildId: interaction.guildId,
      user: { id: interaction.member },
      member: { roles: Array.from(member.roles.valueOf().keys()) },
    });
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
          !stockpile.access.some((access) =>
            AccessDecision.fromEntry(access.rule).permit(...accessArgs),
          )
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
          } as InsertStockpileEntry);

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
      {} as Record<string, Record<string, InsertStockpileEntry>>,
    );
  }
}
