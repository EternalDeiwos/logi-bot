import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { CommonRepository } from 'src/database/util';
import { Guild } from './guild.entity';

@Injectable()
export class GuildRepository extends CommonRepository<Guild> {
  constructor(private readonly dataSource: DataSource) {
    super(Guild, dataSource.createEntityManager());
  }
}
