import { Brackets, Repository } from 'typeorm';
import { CommonQueryBuilder } from 'src/database/util';
import { SelectGuild } from 'src/core/guild/guild.entity';
import { SelectCrew } from 'src/core/crew/crew.entity';
import { SelectTicket, Ticket } from './ticket.entity';

export class TicketQueryBuilder extends CommonQueryBuilder<Ticket> {
  constructor(repo: Repository<Ticket>) {
    super(repo, 'ticket');
    this.qb
      .withDeleted()
      .leftJoinAndSelect('ticket.guild', 'guild')
      .leftJoinAndSelect('ticket.previous', 'previous');
  }

  byThread(ticketRef: SelectTicket | SelectTicket[]) {
    if (!Array.isArray(ticketRef)) {
      ticketRef = [ticketRef];
    }

    this.qb.where('ticket.thread_sf IN (:...tickets)', {
      tickets: ticketRef.map((c) => c.threadSf),
    });

    return this;
  }

  byCrew(crewRef: SelectCrew | SelectCrew[]) {
    if (!Array.isArray(crewRef)) {
      crewRef = [crewRef];
    }

    this.qb.where('ticket.crew_channel_sf IN (:...crews)', {
      crews: crewRef.map((c) => c.crewSf),
    });

    return this;
  }

  byGuild(guildRef: SelectGuild) {
    if (guildRef.id) {
      this.qb.where(new Brackets((qb) => qb.where('ticket.guild_id=:id')));
    } else {
      this.qb.where(new Brackets((qb) => qb.where('guild.guild_sf=:guildSf')));
    }

    this.qb.setParameters(guildRef);
    return this;
  }

  search(query: string) {
    this.qb.andWhere('ticket.name ILIKE :query', { query: `%${query}%` });
    return this;
  }

  withCrew() {
    this.qb.leftJoinAndSelect('ticket.crew', 'crew');
    return this;
  }

  withPreviousGuild() {
    this.qb.leftJoinAndSelect('previous_crew.guild', 'previous_guild');
    return this;
  }

  withPreviousCrew() {
    this.qb.leftJoinAndSelect('previous.crew', 'previous_crew');
    return this;
  }

  withPreviousTeam() {
    this.qb.leftJoinAndSelect('previous_crew.team', 'previous_team');
    return this;
  }

  withPreviousMembers() {
    this.qb.leftJoinAndSelect('previous_crew.members', 'previous_members');
    return this;
  }

  withPreviousLogs() {
    this.qb.leftJoinAndSelect('previous_crew.logs', 'previous_logs');
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

  withShared() {
    this.qb
      .leftJoinAndSelect('crew.shared', 'shared')
      .leftJoinAndSelect('shared.guild', 'shared_guild');
    return this;
  }

  withActiveOnly() {
    this.qb.andWhere('ticket.deleted_at IS NULL');
    return this;
  }
}
