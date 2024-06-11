import { Injectable, Logger } from '@nestjs/common';
import { Context, ContextOf, On } from 'necord';
import { ConfigService } from 'src/config';
import { TagService, TicketTag } from 'src/bot/tag/tag.service';
import { TicketService } from './ticket/ticket.service';

@Injectable()
export class BotEventListener {
  private readonly logger = new Logger(BotEventListener.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly tagService: TagService,
    private readonly ticketService: TicketService,
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

    const tagMap = await ticket.crew.team.getTagMap();

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
}
