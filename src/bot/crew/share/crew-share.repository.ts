import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { CrewShare } from './crew-share.entity';

@Injectable()
export class CrewShareRepository extends Repository<CrewShare> {
  constructor(private readonly dataSource: DataSource) {
    super(CrewShare, dataSource.createEntityManager());
  }
}
