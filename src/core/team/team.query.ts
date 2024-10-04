import { Repository } from 'typeorm';
import { CommonQueryBuilder } from 'src/database/util';
import { SelectGuild } from 'src/core/guild/guild.entity';
import { SelectTeam, Team } from './team.entity';

export class TeamQueryBuilder extends CommonQueryBuilder<Team> {
  constructor(repo: Repository<Team>) {
    super(repo, 'team');
    this.qb.leftJoinAndSelect('team.guild', 'guild');
  }

  byTeam(teamRef: SelectTeam) {
    this.qb.andWhere('team.id=:id', teamRef);
    return this;
  }

  byGuild(guildRef: SelectGuild) {
    if (guildRef.id) {
      this.qb.andWhere('team.guild_id=:id');
    } else {
      this.qb.andWhere('guild.guild_sf=:guildSf');
    }

    this.qb.setParameters(guildRef);
    return this;
  }

  search(query: string) {
    this.qb.andWhere('team.name ILIKE :query', { query: `%${query}%` });
    return this;
  }

  withTags() {
    this.qb.leftJoinAndSelect('team.tags', 'tag').leftJoinAndSelect('tag.template', 'template');
    return this;
  }

  withCrews() {
    this.qb.leftJoinAndSelect('team.crews', 'crew');
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
}
