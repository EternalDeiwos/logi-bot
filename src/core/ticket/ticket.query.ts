import { Brackets, Repository } from 'typeorm';
import { CommonQueryBuilder } from 'src/database/util';
import { SelectTicketDto, Ticket } from './ticket.entity';

export class TicketQueryBuilder extends CommonQueryBuilder<Ticket> {
  constructor(repo: Repository<Ticket>) {
    super(repo, 'ticket');
    this.qb
      .withDeleted()
      .leftJoinAndSelect('ticket.guild', 'guild')
      .leftJoinAndSelect('ticket.previous', 'previous');
  }

  byTicket(ticketRef: SelectTicketDto | SelectTicketDto[]) {
    if (!Array.isArray(ticketRef)) {
      ticketRef = [ticketRef];
    }

    const params = ticketRef.reduce(
      (acc, t) => {
        if (t.id) acc.ids.push(t.id);
        if (t.threadSf) acc.threads.push(t.threadSf);
        return acc;
      },
      { threads: [], ids: [] },
    );

    this.qb.andWhere(
      new Brackets((qb) => {
        if (params.ids.length) {
          qb.where(`${this.alias}.ticket_id IN (:...ids)`);
        }

        if (params.threads.length) {
          qb.orWhere('ticket.thread_sf IN (:...threads)');
        }
      }),
      params,
    );

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
