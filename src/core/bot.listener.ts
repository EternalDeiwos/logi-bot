import { Injectable, Logger, UseFilters } from '@nestjs/common';
import { Context, ContextOf, On } from 'necord';
import { Client } from 'discord.js';
import { DiscordExceptionFilter } from 'src/bot/bot-exception.filter';
import { TicketService } from 'src/core/ticket/ticket.service';
import { CrewService } from 'src/core/crew/crew.service';
import { CrewMemberService } from 'src/core/crew/member/crew-member.service';
import { GuildService } from 'src/core/guild/guild.service';
import { CrewJoinPromptBuilder } from './crew/crew-join.prompt';
import { TicketInfoPromptBuilder } from './ticket/ticket-info.prompt';
import { CrewSettingName } from './crew/crew-setting.entity';

@Injectable()
@UseFilters(DiscordExceptionFilter)
export class BotEventListener {
  private readonly logger = new Logger(BotEventListener.name);

  constructor(
    private readonly client: Client,
    private readonly guildService: GuildService,
    private readonly ticketService: TicketService,
    private readonly crewService: CrewService,
    private readonly memberService: CrewMemberService,
  ) {}

  @On('guildCreate')
  async onGuildCreate(@Context() [discordGuild]: ContextOf<'guildCreate'>) {
    await this.guildService.registerGuild({
      guildSf: discordGuild.id,
      name: discordGuild.name,
      shortName: discordGuild.nameAcronym,
      icon: discordGuild.iconURL({ extension: 'png', forceStatic: true }),
    });

    this.logger.log('Registering guild');
  }

  @On('guildDelete')
  async onGuildDelete(@Context() [guild]: ContextOf<'guildDelete'>) {
    // Deregister guild
  }

  @On('threadDelete')
  async onThreadDelete(@Context() [thread]: ContextOf<'threadDelete'>) {
    const ticket = await this.ticketService
      .query()
      .byTicket({ threadSf: thread.id })
      .withCrew()
      .withCrewSettings()
      .getOneOrFail();

    await this.ticketService.deleteTicket({ threadSf: ticket.id }, this.client.user.id);
    this.logger.warn(
      `Ticket deleted: ${ticket.name} for ${ticket.crew.name} in ${ticket.guild.name}`,
    );
  }

  @On('threadCreate')
  async onThreadCreate(@Context() [thread]: ContextOf<'threadCreate'>) {
    // This is a hack to delay the event to ensure the Ticket record is written to the database before proceeding.
    await new Promise((resolve) => setTimeout(resolve, 2000));
    const ticket = await this.ticketService
      .query()
      .byTicket({ threadSf: thread.id })
      .withCrew()
      .withCrewSettings()
      .getOneOrFail();

    const crewSettings = ticket.crew.getConfig();
    const message = await thread.fetchStarterMessage();
    const prompt = new TicketInfoPromptBuilder();

    prompt.addTriageControls(ticket, {
      disabled: { accept: crewSettings[CrewSettingName.CREW_TRIAGE].asBoolean() },
    });

    if (crewSettings[CrewSettingName.CREW_TRIAGE].asBoolean()) {
      const crews = await this.crewService
        .query()
        .byGuildAndShared({ guildSf: thread.guildId })
        .withTeam()
        .limit(25)
        .order()
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
      await this.memberService.registerCrewMember({ id: roleCrew.id }, member.id);

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
