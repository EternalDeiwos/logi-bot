import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { CommonRepository } from 'src/database/util';
import { StockpileAccess } from './stockpile-access.entity';

@Injectable()
export class StockpileAccessRepository extends CommonRepository<StockpileAccess> {
  constructor(private readonly dataSource: DataSource) {
    super(StockpileAccess, dataSource.createEntityManager());
  }
}
