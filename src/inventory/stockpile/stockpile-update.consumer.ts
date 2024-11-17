import { RabbitSubscribe } from '@golevelup/nestjs-rabbitmq';
import { Injectable, Logger } from '@nestjs/common';
import { parse } from 'csv-parse/sync';
import { ConsumeMessage } from 'amqplib';
import { mapKeys, uniq } from 'lodash';
import { CatalogService } from 'src/game/catalog/catalog.service';
import { StockpileService } from './stockpile.service';
import { SelectStockpileLog } from './stockpile-log.entity';
import { InsertStockpileEntry, StockpileReportRecord } from './stockpile-entry.entity';

@Injectable()
export class StockpileUpdateConsumer {
  private readonly logger = new Logger(StockpileUpdateConsumer.name);

  constructor(
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
  public async processStockpileUpdate(payload: SelectStockpileLog, msg: ConsumeMessage) {
    const log = await this.stockpileService
      .queryLog()
      .byLog(payload)
      .withPoi()
      .withStockpiles()
      .getOneOrFail();

    const records = parse(log.raw, {
      columns: true,
      delimiter: '\t',
      relax_quotes: true,
    }) as StockpileReportRecord[];

    const codeName = uniq(records.map((r) => r.CodeName));
    const catalogList = await this.catalogService.query().byCodeName(codeName).getMany();
    const catalog = mapKeys(catalogList, (r) => r.name);

    const entries: Record<string, InsertStockpileEntry> = records.reduce(
      (state, record) => {
        const item = catalog[record.CodeName];
        const isShippable = item.shippableMax > 0;
        const quantity = parseInt(record.Quantity);

        const entry = state[record.CodeName] || {
          logId: log.id,
          guildId: log.guildId,
          createdBy: log.createdBy,
          warNumber: log.warNumber,
          catalogId: catalog[record.CodeName].id,
          stockpileId: log.location.stockpiles.find((s) => s.name === record['Stockpile Name']).id,
        };

        if (record['Crated?'] === 'true') {
          if (isShippable) {
            entry.quantityShippable = quantity;
          } else {
            entry.quantityCrated = quantity;
          }
        } else {
          entry.quantity = quantity;
        }

        state[record.CodeName] = entry;

        return state;
      },
      {} as Record<string, InsertStockpileEntry>,
    );

    await this.stockpileService.updateStockpile(Object.values(entries));
  }
}