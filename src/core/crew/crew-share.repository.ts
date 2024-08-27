import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { CommonRepository } from 'src/database/util';
import { CrewShare } from './crew-share.entity';

@Injectable()
export class CrewShareRepository extends CommonRepository<CrewShare> {
  constructor(private readonly dataSource: DataSource) {
    super(CrewShare, dataSource.createEntityManager());
  }
}
