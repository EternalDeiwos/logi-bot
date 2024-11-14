import { Injectable, Logger } from '@nestjs/common';
import { InsertResult } from 'typeorm';
import { ValidationError } from 'src/errors';
import { GuildService } from 'src/core/guild/guild.service';
import { WarService } from 'src/game/war/war.service';
import { InsertStockpile } from './stockpile.entity';
import { StockpileRepository } from './stockpile.repository';
import { StockpileLogRepository } from './stockpile-log.repository';
import { StockpileEntryRepository } from './stockpile-entry.repository';
import { StockpileQueryBuilder } from './stockpile.query';
import { InsertStockpileLog } from './stockpile-log.entity';
import { StockpileLogQueryBuilder } from './stockpile-log.query';
import { InsertStockpileEntry } from './stockpile-entry.entity';

export abstract class StockpileService {
  abstract query(): StockpileQueryBuilder;
  abstract queryLog(): StockpileLogQueryBuilder;
  abstract registerStockpile(data: InsertStockpile): Promise<void>;
  abstract registerLog(data: InsertStockpileLog): Promise<InsertResult>;
  abstract updateStockpile(data: InsertStockpileEntry[]): Promise<InsertResult>;
}

@Injectable()
export class StockpileServiceImpl extends StockpileService {
  private readonly logger = new Logger(StockpileService.name);

  constructor(
    private readonly guildService: GuildService,
    private readonly warService: WarService,
    private readonly stockpileRepo: StockpileRepository,
    private readonly logRepo: StockpileLogRepository,
    private readonly entryRepo: StockpileEntryRepository,
  ) {
    super();
  }

  query() {
    return new StockpileQueryBuilder(this.stockpileRepo);
  }

  queryLog() {
    return new StockpileLogQueryBuilder(this.logRepo);
  }

  async registerStockpile(data: InsertStockpile) {
    const war = await this.warService.getCurrent();

    if (data.name.length > 10) {
      throw new ValidationError(
        'VALIDATION_FAILED',
        'Your name is too long to create a tag. Please try again with a `short_name` in your command that is under 20 characters.',
      ).asDisplayable();
    }

    if (await this.query().byLocation({ id: data.locationId }).search(data.name).getExists()) {
      throw new ValidationError(
        'VALIDATION_FAILED',
        `A stockpile called ${data.name} is already registered at this location.`,
      ).asDisplayable();
    }

    const stockpile = this.stockpileRepo.create({ ...data, warNumber: war.warNumber });
    await this.stockpileRepo.insert(stockpile);
  }

  async registerLog(data: InsertStockpileLog) {
    const war = await this.warService.getCurrent();
    const log = this.logRepo.create({ ...data, warNumber: war.warNumber });
    return this.logRepo.insert(log);
  }

  async updateStockpile(data: InsertStockpileEntry[]) {
    return await this.entryRepo.insert(data);
  }
}
