import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { CommonRepository } from 'src/database/util';
import { StockpileEntry } from './stockpile-entry.entity';

@Injectable()
export class StockpileEntryRepository extends CommonRepository<StockpileEntry> {
  constructor(private readonly dataSource: DataSource) {
    super(StockpileEntry, dataSource.createEntityManager());
  }
}
