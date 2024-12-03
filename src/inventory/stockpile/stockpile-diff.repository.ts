import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { CommonRepository } from 'src/database/util';
import { StockpileDiff } from './stockpile-diff.entity';

@Injectable()
export class StockpileDiffRepository extends CommonRepository<StockpileDiff> {
  constructor(private readonly dataSource: DataSource) {
    super(StockpileDiff, dataSource.createEntityManager());
  }
}
