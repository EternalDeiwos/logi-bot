import { Brackets, Repository } from 'typeorm';
import { Snowflake } from 'discord.js';
import { CommonQueryBuilder } from 'src/database/util';
import { SelectGuildDto } from 'src/core/guild/guild.entity';
import { Crew, SelectCrewDto } from './crew.entity';
import { CrewSettingName } from './crew-setting.entity';

const searchWhere = (crewAlias: string = 'crew') => {
  return new Brackets((qb) =>
    qb.where(`${crewAlias}.name ILIKE :query`).orWhere(`${crewAlias}.name_short ILIKE :query`),
  );
};

export class CrewQueryBuilder extends CommonQueryBuilder<Crew> {
  constructor(repo: Repository<Crew>) {
    super(repo, 'crew');
    this.qb.leftJoinAndSelect('crew.guild', 'guild');
  }

  byCrew(crewRef: SelectCrewDto | SelectCrewDto[]) {
    if (!Array.isArray(crewRef)) {
      crewRef = [crewRef];
    }

    const params = crewRef.reduce(
      (acc, c) => {
        if (c.id) acc.crews.push(c.id);
        if (c.crewSf) acc.crewChannels.push(c.crewSf);
        return acc;
      },
      { crews: [], crewChannels: [] },
    );

    this.qb.andWhere(
      new Brackets((qb) => {
        if (params.crews.length) {
          qb.where(`${this.alias}.id IN (:...crews)`);
        }

        if (params.crewChannels.length) {
          qb.orWhere(`${this.alias}.crew_channel_sf IN (:...crewChannels)`);
        }
      }),
      params,
    );

    return this;
  }

  byMember(memberSf: Snowflake | Snowflake[]) {
    if (!Array.isArray(memberSf)) {
      memberSf = [memberSf];
    }

    this.withMembers();
    this.qb.where('member.member_sf IN (:...memberSf)', { memberSf });

    return this;
  }

  byRole(roleSf: Snowflake | Snowflake[]) {
    if (!Array.isArray(roleSf)) {
      roleSf = [roleSf];
    }

    this.qb.where('crew.role_sf IN (:...roleSf)', {
      roleSf,
    });

    return this;
  }

  byGuildAndShared(guildRef: SelectGuildDto) {
    this.qb.leftJoin('crew.shared', 'shared').leftJoinAndSelect('shared.crew', 'shared_crew');

    if (guildRef.id) {
      this.qb.where(
        new Brackets((qb) => qb.where('crew.guild_id=:id').orWhere('shared.target_guild_id=:id')),
      );
    } else {
      this.qb
        .leftJoin('shared.guild', 'target_guild')
        .where(
          new Brackets((qb) =>
            qb.where('guild.guild_sf=:guildSf').orWhere('target_guild.guild_sf=:guildSf'),
          ),
        );
    }

    this.qb.setParameters(guildRef);
    return this;
  }

  searchByGuild(guildRef: SelectGuildDto, query: string) {
    this.byGuild(guildRef);
    this.qb.andWhere(searchWhere(), { query: `%${query}%` });
    return this;
  }

  searchByGuildWithShared(guildRef: SelectGuildDto, query: string) {
    this.qb
      .leftJoin('crew.shared', 'shared')
      .leftJoinAndSelect('shared.crew', 'shared_crew')
      .setParameters({ ...guildRef, query: `%${query}%` });

    if (guildRef.id) {
      this.qb
        .where(new Brackets((qb) => qb.where('crew.guild_id=:id').andWhere(searchWhere())))
        .orWhere(
          new Brackets((qb) =>
            qb.where('shared.target_guild_id=:id').andWhere(searchWhere('shared_crew')),
          ),
        );
    } else {
      this.qb
        .leftJoin('shared.guild', 'target_guild')
        .where(new Brackets((qb) => qb.where('guild.guild_sf=:guildSf').andWhere(searchWhere())))
        .orWhere(
          new Brackets((qb) =>
            qb.where('target_guild.guild_sf=:guildSf').andWhere(searchWhere('shared_crew')),
          ),
        );
    }

    return this;
  }

  bySetting(key: CrewSettingName, value: unknown) {
    this.qb.andWhere(
      new Brackets((qb) =>
        qb.where(`crew_setting.name=:${key}`).andWhere(`crew_setting.value=:v_${key}`),
      ),
      {
        [key]: key,
        [`v_${key}`]: typeof value === 'string' ? value : JSON.stringify(value),
      },
    );
    return this;
  }

  withTeam() {
    this.qb.leftJoinAndSelect('crew.team', 'team');
    return this;
  }

  withMembers() {
    this.qb.leftJoinAndSelect('crew.members', 'member');
    return this;
  }

  withLogs() {
    this.qb.leftJoinAndSelect('crew.logs', 'log');
    return this;
  }

  withTickets() {
    this.qb
      .leftJoinAndSelect('crew.tickets', 'ticket')
      .leftJoinAndSelect('ticket.previous', 'previous');
    return this;
  }

  withShared() {
    this.qb
      .leftJoinAndSelect('crew.shared', 'shared')
      .leftJoinAndSelect('shared.guild', 'shared_guild');
    return this;
  }

  withSettings() {
    this.qb.leftJoinAndSelect('crew.settings', 'crew_setting');
    return this;
  }

  withAccessRules() {
    this.qb.leftJoinAndSelect('crew.access', 'access').leftJoinAndSelect('access.rule', 'rule');
    return this;
  }

  withGuildSettings() {
    this.qb.leftJoinAndSelect('guild.settings', 'guild_setting');
    return this;
  }

  withoutPending() {
    this.qb.andWhere('crew.processed_at IS NOT NULL');
    return this;
  }
}
