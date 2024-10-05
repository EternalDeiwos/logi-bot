import { Brackets, Repository } from 'typeorm';
import { Snowflake } from 'discord.js';
import { CommonQueryBuilder } from 'src/database/util';
import { SelectGuild } from 'src/core/guild/guild.entity';
import { SelectCrew } from 'src/core/crew/crew.entity';
import { CrewMember, SelectCrewMember } from './crew-member.entity';

export class CrewMemberQueryBuilder extends CommonQueryBuilder<CrewMember> {
  constructor(repo: Repository<CrewMember>) {
    super(repo, 'member');
    this.qb
      .leftJoinAndSelect('member.guild', 'guild')
      .leftJoinAndSelect('member.crew', 'crew')
      .andWhere('crew.deleted_at IS NULL');
  }

  byCrewMember(memberRef: SelectCrewMember) {
    this.qb.andWhere(
      new Brackets((qb) =>
        qb.where('member.member_sf=:memberSf AND member.crew_channel_sf=:crewSf', memberRef),
      ),
    );
    return this;
  }

  byMember(memberSf: Snowflake | Snowflake[]) {
    if (!Array.isArray(memberSf)) {
      memberSf = [memberSf];
    }

    this.qb.andWhere('member.member_sf IN (:...memberSf)', { memberSf });

    return this;
  }

  byCrew(crewRef: SelectCrew | SelectCrew[]) {
    if (!Array.isArray(crewRef)) {
      crewRef = [crewRef];
    }

    this.qb.andWhere('member.crew_channel_sf IN (:...crews)', {
      crews: crewRef.map((c) => c.crewSf),
    });

    return this;
  }

  byGuild(guildRef: SelectGuild) {
    if (guildRef.id) {
      this.qb.andWhere(new Brackets((qb) => qb.where('member.guild_id=:id', { id: guildRef.id })));
    } else {
      this.qb.andWhere(
        new Brackets((qb) => qb.where('guild.guild_sf=:guildSf', { guildSf: guildRef.guildSf })),
      );
    }

    return this;
  }

  withTeam() {
    this.qb.leftJoinAndSelect('crew.team', 'team');
    return this;
  }

  withTeamTags() {
    this.qb.leftJoinAndSelect('team.tags', 'team_tags');
    return this;
  }

  withTeamTagsTemplate() {
    this.qb.leftJoinAndSelect('team_tags.template', 'team_tags_template');
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
}
