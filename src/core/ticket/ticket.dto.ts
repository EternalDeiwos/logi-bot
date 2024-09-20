import { PickType } from '@nestjs/swagger';
import { Expose } from 'class-transformer';
import { GuildDto } from 'src/core/guild/guild.dto';
import { Ticket } from './ticket.entity';

export class TicketDto extends PickType(Ticket, [
  'name',
  'content',
  'crewSf',
  'createdAt',
  'createdAt',
  'updatedAt',
  'updatedBy',
  'deletedAt',
  'sortOrder',
] as const) {
  @Expose()
  guild: GuildDto;

  @Expose()
  previous: TicketDto;
}
