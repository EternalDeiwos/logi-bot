import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { Snowflake } from 'discord.js';
import { Team } from './team.entity';

@Injectable()
export class TeamRepository extends Repository<Team> {
  constructor(private readonly dataSource: DataSource) {
    super(Team, dataSource.createEntityManager());
  }

  search(guildId: Snowflake, query: string) {
    return this.createQueryBuilder('team').where(`guild_sf = :guild AND name ILIKE :query`, {
      guild: guildId,
      query: `%${query}%`,
    });
  }
}
