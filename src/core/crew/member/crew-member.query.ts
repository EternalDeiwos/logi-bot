import { Brackets, Repository } from 'typeorm';
import { Snowflake } from 'discord.js';
import { CommonQueryBuilder } from 'src/database/util';
import { CrewMember, SelectCrewMemberDto } from './crew-member.entity';
import { CrewMemberAccess } from 'src/types';

export class CrewMemberQueryBuilder extends CommonQueryBuilder<CrewMember> {
  constructor(repo: Repository<CrewMember>) {
    super(repo, 'member');
    this.qb
      .leftJoinAndSelect('member.guild', 'guild')
      .leftJoinAndSelect('member.crew', 'crew')
      .andWhere('crew.deleted_at IS NULL');
  }

  byCrewMember(memberRef: SelectCrewMemberDto) {
    this.qb.andWhere(
      new Brackets((qb) =>
        qb.where('member.member_sf=:memberSf AND member.crew_id=:crewId', memberRef),
      ),
    );
    return this;
  }

  byAccess(access: CrewMemberAccess) {
    this.qb.andWhere('member.access=:access', { access });
    return this;
  }

  byMember(memberSf: Snowflake | Snowflake[]) {
    if (!Array.isArray(memberSf)) {
      memberSf = [memberSf];
    }

    this.qb.andWhere('member.member_sf IN (:...memberSf)', { memberSf });

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
