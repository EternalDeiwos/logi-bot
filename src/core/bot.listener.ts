import { Injectable, Logger } from '@nestjs/common';
import { Context, ContextOf, On } from 'necord';
import { Equal, IsNull } from 'typeorm';
import { TagService, TicketTag } from 'src/core/tag/tag.service';
import { TicketService } from 'src/core/ticket/ticket.service';
import { TicketRepository } from 'src/core/ticket/ticket.repository';
import { CrewRepository } from 'src/core/crew/crew.repository';
import { CrewService } from 'src/core/crew/crew.service';
import { CrewMemberService } from 'src/core/crew/member/crew-member.service';
import { CrewMemberRepository } from 'src/core/crew/member/crew-member.repository';
import { GuildService } from 'src/core/guild/guild.service';
import { CrewMemberAccess } from 'src/types';

@Injectable()
export class BotEventListener {
  private readonly logger = new Logger(BotEventListener.name);

  constructor(
    private readonly guildService: GuildService,
    private readonly tagService: TagService,
    private readonly ticketService: TicketService,
    private readonly ticketRepo: TicketRepository,
    private readonly crewRepo: CrewRepository,
    private readonly crewService: CrewService,
    private readonly memberRepo: CrewMemberRepository,
    private readonly memberService: CrewMemberService,
  ) {}

  @On('guildCreate')
  async onGuildCreate(@Context() [discordGuild]: ContextOf<'guildCreate'>) {
    const member = await discordGuild.members.fetchMe();
    const result = await Promise.all([
      this.tagService.createTicketTags({ guildSf: discordGuild.id }, member.id),
      this.guildService.registerGuild({
        guildSf: discordGuild.id,
        name: discordGuild.name,
        shortName: discordGuild.nameAcronym,
        icon: discordGuild.iconURL({ extension: 'png', forceStatic: true }),
      }),
    ]);

    this.logger.log('Registering guild');
  }

  @On('guildDelete')
  async onGuildDelete(@Context() [guild]: ContextOf<'guildDelete'>) {
    const member = await guild.members.fetchMe();
    const result = await this.tagService.deleteTagTemplates(member);

    if (!result.affected) {
      return this.logger.warn(`Failed to delete guild tags`);
    }
  }

  @On('threadUpdate')
  async onThreadUpdate(@Context() [oldThread, newThread]: ContextOf<'threadUpdate'>) {
    const guild = newThread.guild;
    const member = await guild.members.fetchMe();
    const ticket = await this.ticketRepo.findOne({ where: { threadSf: oldThread.id } });

    if (!ticket) {
      this.logger.debug(`No ticket for thread update on ${oldThread.name} (${oldThread.id})`);
      return;
    }

    const crew = await this.crewRepo.findOne({
      where: { crewSf: ticket.crewSf },
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
      await this.ticketService.deleteTicket({ threadSf: newThread.id }, member.id);
    }
  }

  @On('threadCreate')
  async onThreadCreate(@Context() [thread]: ContextOf<'threadCreate'>) {
    // This is a hack to delay the event to ensure the Ticket record is written to the database before proceeding.
    await new Promise((resolve) => setTimeout(resolve, 2000));
    const ticket = await this.ticketRepo.findOne({ where: { threadSf: thread.id } });

    if (!ticket?.crew) {
      return;
    }

    if (
      thread.appliedTags.includes(await ticket.crew.team.resolveSnowflakeFromTag(TicketTag.TRIAGE))
    ) {
      await this.ticketService.addTriageControlToThread(thread);
    }

    if (ticket.crew.hasMovePrompt) {
      await this.ticketService.addMovePromptToTicket(thread);
    }
  }

  @On('guildMemberRemove')
  async onMemberLeave(@Context() [member]: ContextOf<'guildMemberRemove'>) {
    await this.memberRepo.update(
      { guild: { guildSf: member.guild.id }, memberSf: member.id },
      { deletedAt: new Date() },
    );
  }

  @On('guildMemberRoleRemove')
  async onRoleRemoved(@Context() [member, role]: ContextOf<'guildMemberRoleRemove'>) {
    try {
      const roleCrew = await this.crewService.getCrewByRole(role.id);
      await this.memberService.removeCrewMember(roleCrew, member);
    } catch {
      this.logger.debug(
        `${member.displayName} was removed from ${role.name} in ${member.guild.name}`,
      );
    }

    return await this.memberService.reconcileIndividualMembership(
      { guildSf: member.guild.id },
      member.id,
    );
  }

  @On('guildMemberRoleAdd')
  async onRoleAdded(@Context() [member, role]: ContextOf<'guildMemberRoleAdd'>) {
    try {
      const roleCrew = await this.crewService.getCrewByRole(role.id);
      await this.memberService.registerCrewMember(roleCrew.crewSf, member.id);
    } catch {
      this.logger.debug(`Role ${role.name} is not a crew role`);
    }
  }
}
