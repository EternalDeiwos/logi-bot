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
      qb.leftJoin('crew.shared', 'shared').leftJoinAndSelect('shared.crew', 'shared_crew');

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

  getByGuild(guildRef: SelectGuild, includeShared: boolean) {
    const qb = this.createQueryBuilder('crew')
      .leftJoinAndSelect('crew.team', 'team')
      .leftJoinAndSelect('crew.guild', 'guild');

    if (guildRef.id) {
      qb.where('crew.guild_id = :id', guildRef);
    } else {
      qb.where('guild.guild_sf = :guildSf', guildRef);
    }

    if (includeShared) {
      qb.leftJoin('crew.shared', 'shared').leftJoinAndSelect('shared.crew', 'shared_crew');

      if (guildRef.id) {
        qb.orWhere('shared.target_guild_id = :id');
      } else {
        qb.leftJoin('shared.guild', 'target_guild').orWhere('target_guild.guild_sf = :guildSf');
      }
    }

    return qb;
  }
}
