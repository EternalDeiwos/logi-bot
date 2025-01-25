import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { CommonRepository } from 'src/database/util';
import { CounterAccess } from './counter-access.entity';

@Injectable()
export class CounterAccessRepository extends CommonRepository<CounterAccess> {
  constructor(private readonly dataSource: DataSource) {
    super(CounterAccess, dataSource.createEntityManager());
  }
}
