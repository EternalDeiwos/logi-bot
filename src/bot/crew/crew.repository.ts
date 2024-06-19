import { Injectable, Logger } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { Snowflake } from 'discord.js';
import { Crew } from './crew.entity';

@Injectable()
export class CrewRepository extends Repository<Crew> {
  constructor(dataSource: DataSource) {
    super(Crew, dataSource.createEntityManager());
  }

  search(guildId: Snowflake, query: string, includeShared = false) {
    const qb = this.createQueryBuilder('crew')
      .leftJoinAndSelect('crew.team', 'team')
      .where(
        'crew.guild_sf = :guild AND (crew.name ILIKE :query OR crew.name_short ILIKE :query)',
        {
          guild: guildId,
          query: `%${query}%`,
        },
      );

    if (includeShared) {
      qb.leftJoin('crew.shared', 'shared')
        .leftJoinAndSelect('crew.parent', 'guild')
        .orWhere(
          'shared.target = :guild AND (crew.name ILIKE :query OR crew.name_short ILIKE :query)',
        );
    }

    return qb;
  }

  getShared(guildId: Snowflake, includeShared = false) {
    const qb = this.createQueryBuilder('crew')
      .leftJoinAndSelect('crew.team', 'team')
      .where('crew.guild_sf = :guild', {
        guild: guildId,
      });

    if (includeShared) {
      qb.leftJoin('crew.shared', 'shared')
        .leftJoinAndSelect('crew.parent', 'guild')
        .orWhere('shared.target = :guild');
    }

    return qb;
  }
}
