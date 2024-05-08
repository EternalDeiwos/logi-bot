import { Injectable, Logger } from '@nestjs/common';
import { Context, ContextOf, On } from 'necord';
import { ConfigService } from 'src/config';
import { TicketService } from './ticket.service';

@Injectable()
export class TicketCreateListener {
  private readonly logger = new Logger(TicketCreateListener.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly ticketService: TicketService,
  ) {}

  @On('threadCreate')
  async onThreadCreate(@Context() [thread]: ContextOf<'threadCreate'>) {
    // This is a hack to delay the event to ensure the Ticket record is written to the database before proceeding.
    await new Promise((resolve) => setTimeout(resolve, 1000));
    const ticket = await this.ticketService.getTicket(thread);

    if (ticket.crew.movePrompt) {
      await this.ticketService.addMovePromptToThread(thread.guild, thread, ticket.crew.channel);
    }
  }
}
