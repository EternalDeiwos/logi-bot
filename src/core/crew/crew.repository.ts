import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { Snowflake } from 'discord.js';
import { CommonRepository } from 'src/database/util';
import { Crew } from './crew.entity';

@Injectable()
export class CrewRepository extends CommonRepository<Crew> {
  constructor(dataSource: DataSource) {
    super(Crew, dataSource.createEntityManager());
  }

  search(guildRef: Snowflake, query: string, includeShared = false) {
    const qb = this.createQueryBuilder('crew')
      .leftJoinAndSelect('crew.team', 'team')
      .leftJoinAndSelect('crew.parent', 'guild')
      .where(
        'crew.guild_sf = :guild AND (crew.name ILIKE :query OR crew.name_short ILIKE :query)',
        {
          guild: guildRef,
          query: `%${query}%`,
        },
      );

    if (includeShared) {
      qb.leftJoin('crew.shared', 'shared').orWhere(
        'shared.target = :guild AND (crew.name ILIKE :query OR crew.name_short ILIKE :query)',
      );
    }

    return qb;
  }

  getShared(guildRef: Snowflake, includeShared = false) {
    const qb = this.createQueryBuilder('crew')
      .leftJoinAndSelect('crew.team', 'team')
      .where('crew.guild_sf = :guild', {
        guild: guildRef,
      });

    if (includeShared) {
      qb.leftJoin('crew.shared', 'shared')
        .leftJoinAndSelect('crew.parent', 'guild')
        .orWhere('shared.target = :guild');
    }

    return qb;
  }
}
