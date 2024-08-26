import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { StockpileEntry } from './stockpile-entry.entity';

@Injectable()
export class StockpileEntryRepository extends Repository<StockpileEntry> {
  constructor(private readonly dataSource: DataSource) {
    super(StockpileEntry, dataSource.createEntityManager());
  }
}
