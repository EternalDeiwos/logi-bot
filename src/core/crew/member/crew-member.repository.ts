import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { Snowflake } from 'discord.js';
import { CrewMemberAccess } from 'src/types';
import { CommonRepository } from 'src/database/util';
import { CrewMember } from './crew-member.entity';
import { SelectGuild } from 'src/core/guild/guild.entity';

@Injectable()
export class CrewMemberRepository extends CommonRepository<CrewMember> {
  constructor(private readonly dataSource: DataSource) {
    super(CrewMember, dataSource.createEntityManager());
  }

  findByAccess(guildRef: SelectGuild, memberRef: Snowflake, access: CrewMemberAccess) {
    const qb = this.createQueryBuilder('member');

    if (guildRef.id) {
      qb.where('member.guild_id = :id');
    } else {
      qb.leftJoin('member.guild', 'guild').where('guild.guild_sf = :guildSf');
    }

    qb.innerJoin('member.crew', 'crew').andWhere(
      `member.member_sf = :memberRef AND member.access <= :access`,
      { ...guildRef, memberRef, access },
    );

    return qb.getManyAndCount();
  }
}
