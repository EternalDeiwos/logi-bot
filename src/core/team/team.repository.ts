import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { Snowflake } from 'discord.js';
import { CommonRepository } from 'src/database/util';
import { Guild } from 'src/core/guild/guild.entity';
import { Team } from './team.entity';

@Injectable()
export class TeamRepository extends CommonRepository<Team> {
  constructor(private readonly dataSource: DataSource) {
    super(Team, dataSource.createEntityManager());
  }

  search(guildSf: Snowflake, query: string) {
    return this.createQueryBuilder('team')
      .innerJoin(Guild, 'guild', 'team.guild_id=guild.id')
      .where(`guild.guild_sf = :id AND team.name ILIKE :query`, {
        id: guildSf,
        query: `%${query}%`,
      });
  }
}
