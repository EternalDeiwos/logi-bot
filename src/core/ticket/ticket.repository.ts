import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { CommonRepository } from 'src/database/util';
import { SelectGuild } from 'src/core/guild/guild.entity';
import { SelectTicket, Ticket } from './ticket.entity';

@Injectable()
export class TicketRepository extends CommonRepository<Ticket> {
  constructor(private readonly dataSource: DataSource) {
    super(Ticket, dataSource.createEntityManager());
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
}
