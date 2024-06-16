import { Injectable, Logger } from '@nestjs/common';
import { Context, ContextOf, On } from 'necord';
import { ConfigService } from 'src/config';
import { TagService, TicketTag } from 'src/bot/tag/tag.service';
import { TicketService } from './ticket/ticket.service';
import { CrewService } from './crew/crew.service';

@Injectable()
export class BotEventListener {
  private readonly logger = new Logger(BotEventListener.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly tagService: TagService,
    private readonly ticketService: TicketService,
    private readonly crewService: CrewService,
  ) {}

  @On('guildCreate')
  async onGuildCreate(@Context() [guild]: ContextOf<'guildCreate'>) {
    const member = await guild.members.fetchMe();
    const result = await this.tagService.createTicketTags(member);

    if (result.success) {
      this.logger.log('Creating guild tags');
    } else {
      this.logger.warn(`Failed to create guild tags: ${result.message}`);
    }
  }

  @On('guildDelete')
  async onGuildDelete(@Context() [guild]: ContextOf<'guildDelete'>) {
    const member = await guild.members.fetchMe();
    const result = await this.tagService.deleteTagTemplates(member);

    if (!result.success) {
      return this.logger.warn(`Failed to delete guild tags: ${result.message}`);
    }
  }

  @On('threadUpdate')
  async onThreadUpdate(@Context() [oldThread, newThread]: ContextOf<'threadUpdate'>) {
    const guild = newThread.guild;
    const member = await guild.members.fetchMe();
    const ticket = await this.ticketService.getTicket(oldThread.id);

    if (!ticket) {
      this.logger.debug(`No ticket for thread update on ${oldThread.name} (${oldThread.id})`);
      return;
    }

    const crew = await this.crewService.getCrew(ticket.discussion, { withDeleted: true });
    const tagMap = await crew.team.getTagMap();

    const toDeleteFlag = newThread.appliedTags.reduce((state, snowflake) => {
      return (
        state ||
        [TicketTag.DONE, TicketTag.ABANDONED, TicketTag.DECLINED].includes(
          tagMap[snowflake] as TicketTag,
        )
      );
    }, false);

    const deletedFlag = oldThread.appliedTags.reduce((state, snowflake) => {
      return (
        state ||
        [TicketTag.DONE, TicketTag.ABANDONED, TicketTag.DECLINED].includes(
          tagMap[snowflake] as TicketTag,
        )
      );
    }, false);

    if (toDeleteFlag && !deletedFlag) {
      this.logger.log(`Deleting ticket ${ticket.name}`);
      await this.ticketService.deleteTicket(newThread.id, member, true, false);
    }
  }

  @On('threadCreate')
  async onThreadCreate(@Context() [thread]: ContextOf<'threadCreate'>) {
    // This is a hack to delay the event to ensure the Ticket record is written to the database before proceeding.
    await new Promise((resolve) => setTimeout(resolve, 1000));
    const ticket = await this.ticketService.getTicket(thread);

    if (!ticket?.crew) {
      return;
    }

    if (
      thread.appliedTags.includes(await ticket.crew.team.resolveSnowflakeFromTag(TicketTag.TRIAGE))
    ) {
      await this.ticketService.addTriageControlToThread(thread.guild, thread);
    }

    if (ticket.crew.movePrompt) {
      await this.ticketService.addMovePromptToThread(thread.guild, thread, ticket.crew.channel);
    }
  }
}
