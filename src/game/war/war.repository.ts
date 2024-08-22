import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { War } from './war.entity';

@Injectable()
export class WarRepository extends Repository<War> {
  constructor(private readonly dataSource: DataSource) {
    super(War, dataSource.createEntityManager());
  }

  getCurrent() {
    return this.createQueryBuilder()
      .select()
      .distinctOn(['war_number'])
      .orderBy('war_number', 'DESC')
      .limit(1)
      .getOne();
  }
}
