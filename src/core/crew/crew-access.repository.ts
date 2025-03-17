import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { CommonRepository } from 'src/database/util';
import { CrewAccess } from './crew-access.entity';

@Injectable()
export class CrewAccessRepository extends CommonRepository<CrewAccess> {
  constructor(private readonly dataSource: DataSource) {
    super(CrewAccess, dataSource.createEntityManager());
  }
}
