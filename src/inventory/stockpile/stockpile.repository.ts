import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { Stockpile } from './stockpile.entity';

@Injectable()
export class StockpileRepository extends Repository<Stockpile> {
  constructor(private readonly dataSource: DataSource) {
    super(Stockpile, dataSource.createEntityManager());
  }
}
