import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { Snowflake } from 'discord.js';
import { CommonRepository } from 'src/database/util';
import { SelectGuild } from 'src/core/guild/guild.entity';
import { Crew } from './crew.entity';

@Injectable()
export class CrewRepository extends CommonRepository<Crew> {
  constructor(dataSource: DataSource) {
    super(Crew, dataSource.createEntityManager());
  }

  search(guildRef: SelectGuild, query: string, includeShared = false) {
    const qb = this.createQueryBuilder('crew')
      .leftJoinAndSelect('crew.team', 'team')
      .leftJoinAndSelect('crew.guild', 'guild');

    if (guildRef.id) {
      qb.where(
        'crew.guild_id = :guild AND (crew.name ILIKE :query OR crew.name_short ILIKE :query) AND crew.deleted_at IS NULL',
        {
          guild: guildRef.id,
          query: `%${query}%`,
        },
      );
    } else {
      qb.where(
        'guild.guild_sf = :guild AND (crew.name ILIKE :query OR crew.name_short ILIKE :query) AND crew.deleted_at IS NULL',
        {
          guild: guildRef.guildSf,
          query: `%${query}%`,
        },
      );
    }

    if (includeShared) {
      qb.leftJoin('crew.shared', 'shared');

      if (guildRef.id) {
        qb.orWhere(
          'shared.target_guild_id = :guild AND (crew.name ILIKE :query OR crew.name_short ILIKE :query)',
        );
      } else {
        qb.leftJoin('shared.guild', 'target_guild').orWhere(
          'target_guild.guild_sf = :guild AND (crew.name ILIKE :query OR crew.name_short ILIKE :query)',
        );
      }
    }

    return qb;
  }

  getShared(guildRef: Snowflake, includeShared = false) {
    const qb = this.createQueryBuilder('crew')
      .leftJoinAndSelect('crew.team', 'team')
      .leftJoinAndSelect('crew.guild', 'guild')
      .where('guild.guild_sf = :guild', {
        guild: guildRef,
      });

    if (includeShared) {
      qb.leftJoin('crew.shared', 'shared')
        .leftJoin('shared.guild', 'target_guild')
        .leftJoinAndSelect('shared.crew', 'shared_crew')
        .orWhere('target_guild.guild_sf = :guild');
    }

    return qb;
  }
}
