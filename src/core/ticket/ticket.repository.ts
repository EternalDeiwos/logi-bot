import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { CommonRepository } from 'src/database/util';
import { SelectGuild } from 'src/core/guild/guild.entity';
import { SelectCrew } from 'src/core/crew/crew.entity';
import { SelectTicket, Ticket } from './ticket.entity';

@Injectable()
export class TicketRepository extends CommonRepository<Ticket> {
  constructor(private readonly dataSource: DataSource) {
    super(Ticket, dataSource.createEntityManager());
  }

  findTickets() {
    return this.createQueryBuilder('ticket')
      .withDeleted()
      .leftJoinAndSelect('ticket.guild', 'guild')
      .leftJoinAndSelect('ticket.previous', 'previous');
  }

  findOneTicket(ticketRef: SelectTicket) {
    return this.findTickets()
      .leftJoinAndSelect('ticket.crew', 'crew')
      .where('ticket.threadSf=:threadSf', ticketRef);
  }

  findCrewTickets(crewRef: SelectCrew) {
    return this.findTickets().where('ticket.deleted_at IS NULL AND ticket.crewSf=:crewSf', crewRef);
  }

  async getOriginalGuild(ticketRef: SelectTicket): Promise<SelectGuild> {
    const [{ guild_id: guildId }] = await this.query(
      `
      WITH RECURSIVE ticket_tree (thread_sf, guild_id, previous_thread_sf) AS (
        (
          SELECT
            thread_sf,
            guild_id,
            previous_thread_sf
          FROM "app"."ticket"
          WHERE thread_sf=$1
        )
        UNION ALL
        (
          SELECT
            t.thread_sf,
            t.guild_id,
            t.previous_thread_sf
          FROM "app"."ticket" t, ticket_tree tt
          WHERE tt.previous_thread_sf = t.thread_sf
        )
      )
      SELECT guild_id FROM ticket_tree
      WHERE previous_thread_sf IS NULL
    `,
      [ticketRef.threadSf],
    );

    return { id: guildId };
  }

  searchByGuild(guildRef: SelectGuild, query: string) {
    const qb = this.createQueryBuilder('ticket')
      .withDeleted()
      .leftJoinAndSelect('ticket.guild', 'guild')
      .leftJoinAndSelect('ticket.previous', 'previous')
      .where('ticket.deleted_at IS NULL')
      .andWhere('ticket.name ILIKE :query');

    if (guildRef.id) {
      qb.andWhere('ticket.guild_id=:id', { ...guildRef, query: `%${query}%` });
    } else {
      qb.andWhere('guild.guild_sf=:guildSf', { ...guildRef, query: `%${query}%` });
    }

    return qb.getMany();
  }

  searchByCrew(crewRef: SelectCrew, query: string) {
    return this.createQueryBuilder('ticket')
      .withDeleted()
      .leftJoinAndSelect('ticket.guild', 'guild')
      .leftJoinAndSelect('ticket.previous', 'previous')
      .where('ticket.deleted_at IS NULL')
      .leftJoin('ticket.crew', 'crew')
      .andWhere('crew.crew_channel_sf=:crewSf AND (ticket.name ILIKE :query)', {
        ...crewRef,
        query: `%${query}%`,
      })
      .getMany();
  }
}
