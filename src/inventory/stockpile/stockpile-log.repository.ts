import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { StockpileLog } from './stockpile-log.entity';

@Injectable()
export class StockpileLogRepository extends Repository<StockpileLog> {
  constructor(private readonly dataSource: DataSource) {
    super(StockpileLog, dataSource.createEntityManager());
  }
}
