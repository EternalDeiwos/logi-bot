import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { CommonRepository } from 'src/database/util';
import { Stockpile } from './stockpile.entity';

@Injectable()
export class StockpileRepository extends CommonRepository<Stockpile> {
  constructor(private readonly dataSource: DataSource) {
    super(Stockpile, dataSource.createEntityManager());
  }
}
