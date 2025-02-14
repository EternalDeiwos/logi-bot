import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { CommonRepository } from 'src/database/util';
import { Team } from './team.entity';

@Injectable()
export class TeamRepository extends CommonRepository<Team> {
  constructor(private readonly dataSource: DataSource) {
    super(Team, dataSource.createEntityManager());
  }
}
