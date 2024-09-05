import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { CommonRepository } from 'src/database/util';
import { CurrentRegionLog, RegionLog } from './region-log.entity';

@Injectable()
export class RegionLogRepository extends CommonRepository<RegionLog> {
  constructor(private readonly dataSource: DataSource) {
    super(RegionLog, dataSource.createEntityManager());
  }
}

@Injectable()
export class CurrentRegionLogRepository extends Repository<CurrentRegionLog> {
  constructor(private readonly dataSource: DataSource) {
    super(CurrentRegionLog, dataSource.createEntityManager());
  }
}
