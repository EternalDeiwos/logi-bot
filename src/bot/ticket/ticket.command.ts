import { Injectable, Logger } from '@nestjs/common';
import { StringOption } from 'necord';
import { ConfigService } from 'src/config';
import { EchoCommand } from 'src/bot/echo.command-group';
import { TicketService as TicketService } from './ticket.service';

export class CreateCrewCommandParams {
  @StringOption({
    name: 'name',
    description: 'Tag name',
    required: true,
  })
  name: string;
}

@Injectable()
@EchoCommand({
  name: 'ticket',
  description: 'Manage tickets',
})
export class TicketCommand {
  private readonly logger = new Logger(TicketCommand.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly ticketService: TicketService,
  ) {}
}
