import { Injectable, Logger } from '@nestjs/common';
import { Context, ContextOf, On } from 'necord';
import { Config, ConfigService } from 'src/config';
import { OperationStatus } from 'src/util';
import { TagService, TicketTag } from 'src/bot/tag/tag.service';
import { TicketService } from './ticket/ticket.service';
import { TicketRepository } from './ticket/ticket.repository';
import { CrewRepository } from './crew/crew.repository';
import { CrewMemberRepository } from './crew/member/crew-member.repository';
import { GuildService } from './guild/guild.service';
import { MoveTicketBehaviour } from 'src/types';

@Injectable()
export class BotEventListener {
  private readonly logger = new Logger(BotEventListener.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly tagService: TagService,
    private readonly ticketService: TicketService,
    private readonly ticketRepo: TicketRepository,
    private readonly crewRepo: CrewRepository,
    private readonly guildService: GuildService,
  ) {}

  @On('guildCreate')
  async onGuildCreate(@Context() [guild]: ContextOf<'guildCreate'>) {
    const member = await guild.members.fetchMe();
    const result = OperationStatus.collect(
      await Promise.all([
        this.tagService.createTicketTags(member),
        this.guildService.registerGuild({
          guild: guild.id,
          name: guild.name,
          shortName: guild.nameAcronym,
          icon: guild.iconURL({ extension: 'png', forceStatic: true }),
        }),
      ]),
    );

    if (result.success) {
      this.logger.log('Registering guild');
    } else {
      this.logger.warn(`Failed to register guild: ${result.message}`);
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
    const ticket = await this.ticketRepo.findOne({ where: { thread: oldThread.id } });

    if (!ticket) {
      this.logger.debug(`No ticket for thread update on ${oldThread.name} (${oldThread.id})`);
      return;
    }

    const crew = await this.crewRepo.findOne({
      where: { channel: ticket.discussion },
      withDeleted: true,
    });

    const tagMap = await crew.team.getTagMap();

    const toDeleteFlag = newThread.appliedTags.reduce((state, snowflake) => {
      return (
        state ||
        [TicketTag.DONE, TicketTag.ABANDONED, TicketTag.DECLINED, TicketTag.MOVED].includes(
          tagMap[snowflake] as TicketTag,
        )
      );
    }, false);

    const deletedFlag = oldThread.appliedTags.reduce((state, snowflake) => {
      return (
        state ||
        [TicketTag.DONE, TicketTag.ABANDONED, TicketTag.DECLINED, TicketTag.MOVED].includes(
          tagMap[snowflake] as TicketTag,
        )
      );
    }, false);

    if (toDeleteFlag && !deletedFlag) {
      this.logger.log(`Deleting ticket ${ticket.name}`);
      const softDelete =
        (await this.configService.get<string>(Config.APP_TICKETS_MOVE_ACTION)) ===
        MoveTicketBehaviour.ARCHIVE;
      await this.ticketService.deleteTicket(newThread.id, member, {
        softDelete,
        skipAccessControl: true,
      });
    }
  }

  @On('threadCreate')
  async onThreadCreate(@Context() [thread]: ContextOf<'threadCreate'>) {
    // This is a hack to delay the event to ensure the Ticket record is written to the database before proceeding.
    await new Promise((resolve) => setTimeout(resolve, 2000));
    const ticket = await this.ticketRepo.findOne({ where: { thread: thread.id } });

    if (!ticket?.crew) {
      return;
    }

    if (
      thread.appliedTags.includes(await ticket.crew.team.resolveSnowflakeFromTag(TicketTag.TRIAGE))
    ) {
      await this.ticketService.addTriageControlToThread(thread);
    }

    if (ticket.crew.movePrompt) {
      await this.ticketService.addMovePromptToTicket(thread);
    }
  }
}
