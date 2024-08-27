import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { CommonRepository } from 'src/database/util';
import { StockpileLog } from './stockpile-log.entity';

@Injectable()
export class StockpileLogRepository extends CommonRepository<StockpileLog> {
  constructor(private readonly dataSource: DataSource) {
    super(StockpileLog, dataSource.createEntityManager());
  }
}
