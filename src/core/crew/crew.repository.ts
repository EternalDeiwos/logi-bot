import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { CommonRepository } from 'src/database/util';
import { SelectGuild } from 'src/core/guild/guild.entity';
import { Crew } from './crew.entity';

@Injectable()
export class CrewRepository extends CommonRepository<Crew> {
  constructor(dataSource: DataSource) {
    super(Crew, dataSource.createEntityManager());
  }
}
