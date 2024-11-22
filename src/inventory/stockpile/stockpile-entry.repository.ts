import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { CommonRepository } from 'src/database/util';
import { CurrentStockpileEntry, StockpileEntry } from './stockpile-entry.entity';

@Injectable()
export class StockpileEntryRepository extends CommonRepository<StockpileEntry> {
  constructor(private readonly dataSource: DataSource) {
    super(StockpileEntry, dataSource.createEntityManager());
  }
}

@Injectable()
export class CurrentStockpileEntryRepository extends Repository<CurrentStockpileEntry> {
  constructor(private readonly dataSource: DataSource) {
    super(CurrentStockpileEntry, dataSource.createEntityManager());
  }
}
