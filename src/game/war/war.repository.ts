import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { CommonRepository } from 'src/database/util';
import { War } from './war.entity';

@Injectable()
export class WarRepository extends CommonRepository<War> {
  constructor(private readonly dataSource: DataSource) {
    super(War, dataSource.createEntityManager());
  }
}
