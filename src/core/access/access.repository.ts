import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { CommonRepository } from 'src/database/util';
import { AccessEntry } from './access.entity';

@Injectable()
export class AccessEntryRepository extends CommonRepository<AccessEntry> {
  constructor(dataSource: DataSource) {
    super(AccessEntry, dataSource.createEntityManager());
  }
}
