import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InsertResult, UpdateResult } from 'typeorm';
import { ValidationError } from 'src/errors';
import { WarService } from 'src/game/war/war.service';
import { InsertStockpile } from './stockpile.entity';
import { StockpileRepository } from './stockpile.repository';
import { StockpileLogRepository } from './stockpile-log.repository';
import {
  CurrentStockpileEntryRepository,
  StockpileEntryRepository,
} from './stockpile-entry.repository';
import { StockpileAccessRepository } from './stockpile-access.repository';
import { StockpileQueryBuilder } from './stockpile.query';
import { InsertStockpileLog, SelectStockpileLog } from './stockpile-log.entity';
import { StockpileLogQueryBuilder } from './stockpile-log.query';
import { InsertStockpileEntry } from './stockpile-entry.entity';
import { StockpileEntryQueryBuilder } from './stockpile-entry.query';
import { InsertStockpileAccess, SelectStockpileAccess } from './stockpile-access.entity';

export abstract class StockpileService {
  abstract query(): StockpileQueryBuilder;
  abstract queryLog(): StockpileLogQueryBuilder;
  abstract queryEntries(): StockpileEntryQueryBuilder;
  abstract registerStockpile(data: InsertStockpile): Promise<void>;
  abstract registerLog(data: InsertStockpileLog): Promise<InsertResult>;
  abstract updateStockpile(data: InsertStockpileEntry[]): Promise<InsertResult>;
  abstract completeLogProcessing(logRef: SelectStockpileLog): Promise<UpdateResult>;
  abstract grantAccess(data: InsertStockpileAccess): Promise<InsertResult>;
  abstract revokeAccess(
    accessRef: SelectStockpileAccess | SelectStockpileAccess[],
  ): Promise<UpdateResult>;
}

@Injectable()
export class StockpileServiceImpl extends StockpileService {
  private readonly logger = new Logger(StockpileService.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly warService: WarService,
    private readonly stockpileRepo: StockpileRepository,
    private readonly logRepo: StockpileLogRepository,
    private readonly currentEntryRepo: CurrentStockpileEntryRepository,
    private readonly entryRepo: StockpileEntryRepository,
    private readonly accessRepo: StockpileAccessRepository,
  ) {
    super();
  }

  query() {
    return new StockpileQueryBuilder(this.stockpileRepo);
  }

  queryLog() {
    return new StockpileLogQueryBuilder(this.logRepo);
  }

  queryEntries() {
    const gameVersion = this.configService.getOrThrow<string>('APP_FOXHOLE_VERSION');
    const catalogVersion = this.configService.getOrThrow<string>('APP_CATALOG_VERSION');
    return new StockpileEntryQueryBuilder(this.currentEntryRepo, gameVersion, catalogVersion);
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

  async completeLogProcessing(logRef: SelectStockpileLog) {
    return await this.logRepo.update(logRef, { processedAt: new Date() });
  }

  async grantAccess(data: InsertStockpileAccess) {
    return await this.accessRepo.insert(data);
  }

  async revokeAccess(accessRef: SelectStockpileAccess | SelectStockpileAccess[]) {
    if (!Array.isArray(accessRef)) {
      accessRef = [accessRef];
    }

    return await this.accessRepo
      .createQueryBuilder('access')
      .update()
      .set({ deletedAt: new Date() })
      .where('access.id IN (:...access)', { access: accessRef.map((a) => a.id) })
      .execute();
  }
}
