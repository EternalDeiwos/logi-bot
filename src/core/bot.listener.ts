import { Injectable, Logger, UseFilters } from '@nestjs/common';
import { Context, ContextOf, On } from 'necord';
import { DiscordExceptionFilter } from 'src/bot/bot-exception.filter';
import { TagService, TicketTag } from 'src/core/tag/tag.service';
import { TicketService } from 'src/core/ticket/ticket.service';
import { CrewService } from 'src/core/crew/crew.service';
import { CrewMemberService } from 'src/core/crew/member/crew-member.service';
import { GuildService } from 'src/core/guild/guild.service';
import { CrewJoinPromptBuilder } from './crew/crew-join.prompt';
import { TicketInfoPromptBuilder } from './ticket/ticket-info.prompt';
import { Team } from './team/team.entity';

@Injectable()
@UseFilters(DiscordExceptionFilter)
export class BotEventListener {
  private readonly logger = new Logger(BotEventListener.name);

  constructor(
    private readonly guildService: GuildService,
    private readonly tagService: TagService,
    private readonly ticketService: TicketService,
    private readonly crewService: CrewService,
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
    const ticket = await this.ticketService
      .query()
      .byTicket({ threadSf: oldThread.id })
      .withCrew()
      .getOneOrFail();

    if (!ticket) {
      this.logger.debug(`No ticket for thread update on ${oldThread.name} (${oldThread.id})`);
      return;
    }

    const tags = await this.tagService.queryTag().byTeam({ id: ticket.crew.teamId }).getMany();
    const tagMap = await Team.getTagMap(tags);

    const toDeleteFlag = newThread.appliedTags.reduce((state, snowflake) => {
      return (
        state ||
        [TicketTag.DONE, TicketTag.ABANDONED, TicketTag.DECLINED, TicketTag.MOVED].includes(
          tagMap[snowflake] as TicketTag,
        )
      );
    }, false);

    const deletedFlag =
      Boolean(ticket.deletedAt) &&
      oldThread.appliedTags.reduce((state, snowflake) => {
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
    const ticket = await this.ticketService
      .query()
      .byTicket({ threadSf: thread.id })
      .withCrew()
      .getOneOrFail();

    const message = await thread.fetchStarterMessage();
    const prompt = new TicketInfoPromptBuilder();
    const triageTag = await this.tagService
      .queryTag()
      .byTeam({ id: ticket.crew.teamId })
      .search(TicketTag.TRIAGE)
      .getOneOrFail();

    if (thread.appliedTags.includes(triageTag.tagSf)) {
      prompt.addTriageControls(ticket, { disabled: { accept: ticket.crew.hasMovePrompt } });
    }

    if (ticket.crew.hasMovePrompt) {
      const crews = await this.crewService
        .query()
        .byGuildAndShared({ guildSf: thread.guildId })
        .withTeam()
        .getMany();
      prompt.addMoveSelector(
        { threadSf: thread.id },
        thread.guildId,
        crews.filter((crew) => ![ticket.crewId].includes(crew.id)),
      );
    }

    await message.edit(prompt.build());

    this.logger.log(`New ticket: ${ticket.name} for ${ticket.crew.name} in ${ticket.guild.name}`);
  }

  @On('guildMemberRemove')
  async onMemberLeave(@Context() [member]: ContextOf<'guildMemberRemove'>) {
    const result = await this.memberService.removeGuildMemberCrews(
      { guildSf: member.guild.id },
      member.id,
    );
    this.logger.log(
      `${member.displayName} has left ${member.guild.name}. Removed ${result.affected} crew memberships.`,
    );
  }

  @On('guildMemberRoleRemove')
  async onRoleRemoved(@Context() [member, role]: ContextOf<'guildMemberRoleRemove'>) {
    try {
      const roleCrew = await this.crewService.query().withDeleted().byRole(role.id).getOneOrFail();
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
      const roleCrew = await this.crewService.query().byRole(role.id).getOneOrFail();
      await this.memberService.registerCrewMember(roleCrew.crewSf, member.id);

      const prompt = new CrewJoinPromptBuilder().addJoinMessage(roleCrew, member);
      const channel = await member.guild.channels.fetch(roleCrew.crewSf);

      if (channel && channel.isTextBased()) {
        await channel.send(prompt.build());
      }
    } catch {
      this.logger.debug(`Role ${role.name} is not a crew role`);
    }
  }
}
