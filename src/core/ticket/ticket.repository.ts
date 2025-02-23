import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { CommonRepository } from 'src/database/util';
import { SelectGuildDto } from 'src/core/guild/guild.entity';
import { SelectTicketDto, Ticket } from './ticket.entity';

@Injectable()
export class TicketRepository extends CommonRepository<Ticket> {
  constructor(private readonly dataSource: DataSource) {
    super(Ticket, dataSource.createEntityManager());
  }

  async getOriginalGuild(ticketRef: SelectTicketDto): Promise<SelectGuildDto> {
    const [{ guild_id: guildId }] = await this.query(
      `
      WITH RECURSIVE ticket_tree (id, guild_id, previous_ticket_id) AS (
        (
          SELECT
            id,
            guild_id,
            previous_ticket_id
          FROM "app"."ticket"
          WHERE id=$1
        )
        UNION ALL
        (
          SELECT
            t.id,
            t.guild_id,
            t.previous_ticket_id
          FROM "app"."ticket" t, ticket_tree tt
          WHERE tt.previous_ticket_id = t.id
        )
      )
      SELECT guild_id FROM ticket_tree
      WHERE previous_ticket_id IS NULL
    `,
      [ticketRef.id],
    );

    return { id: guildId };
  }
}
