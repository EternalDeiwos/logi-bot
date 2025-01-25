import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { CommonRepository } from 'src/database/util';
import { CounterEntry } from './counter-entry.entity';

@Injectable()
export class CounterEntryRepository extends CommonRepository<CounterEntry> {
  constructor(private readonly dataSource: DataSource) {
    super(CounterEntry, dataSource.createEntityManager());
  }
}
