import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { CommonRepository } from 'src/database/util';
import { Counter, CurrentCounter } from './counter.entity';

@Injectable()
export class CounterRepository extends CommonRepository<Counter> {
  constructor(private readonly dataSource: DataSource) {
    super(Counter, dataSource.createEntityManager());
  }
}

@Injectable()
export class CurrentCounterRepository extends CommonRepository<CurrentCounter> {
  constructor(private readonly dataSource: DataSource) {
    super(CurrentCounter, dataSource.createEntityManager());
  }
}
