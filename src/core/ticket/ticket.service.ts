import { forwardRef, Inject, Injectable, Logger } from '@nestjs/common';
import { InsertResult } from 'typeorm';
import { GuildBasedChannel, GuildManager, PermissionsBitField, Snowflake } from 'discord.js';
import { AuthError, InternalError, ValidationError } from 'src/errors';
import { TicketTag } from 'src/types';
import { DiscordService } from 'src/bot/discord.service';
import { GuildService } from 'src/core/guild/guild.service';
import { SelectGuildDto } from 'src/core/guild/guild.entity';
import { CrewInfoPromptBuilder } from 'src/core/crew/crew-info.prompt';
import { CrewService } from 'src/core/crew/crew.service';
import { SelectCrewChannelDto } from 'src/core/crew/crew.entity';
import { InsertTicketDto, SelectTicketDto, Ticket, UpdateTicketDto } from './ticket.entity';
import { TicketRepository } from './ticket.repository';
import { TicketInfoPromptBuilder } from './ticket-info.prompt';
import { TicketUpdatePromptBuilder } from './ticket-update.prompt';
import { TicketClosedPromptBuilder } from './ticket-closed.prompt';
import { TicketStatusPromptBuilder } from './ticket-status.prompt';
import { TicketQueryBuilder } from './ticket.query';

export abstract class TicketService {
  abstract query(): TicketQueryBuilder;
  abstract createTicket(
    crewRef: SelectCrewChannelDto,
    ticket?: InsertTicketDto,
  ): Promise<InsertResult>;
  abstract moveTicket(ticketRef: SelectTicketDto, ticketOverride: InsertTicketDto);
  abstract deleteTicket(ticketRef: SelectTicketDto, memberRef: Snowflake);
  abstract updateTicket(
    ticketRef: SelectTicketDto,
    update: UpdateTicketDto,
    reason?: string,
  ): Promise<Ticket>;
  abstract refreshTicket(ticket: Ticket): Promise<void>;

  abstract sendIndividualStatus(
    crewRef: SelectCrewChannelDto,
    targetChannelRef: Snowflake,
    memberRef: Snowflake,
  ): Promise<void>;

  abstract sendAllStatus(
    guildRef: SelectGuildDto,
    targetChannelRef: Snowflake,
    memberRef: Snowflake,
  ): Promise<void>;
}

@Injectable()
export class TicketServiceImpl extends TicketService {
  private readonly logger = new Logger(TicketService.name);

  constructor(
    private readonly guildManager: GuildManager,
    private readonly discordService: DiscordService,
    private readonly guildService: GuildService,
    @Inject(forwardRef(() => CrewService)) private readonly crewService: CrewService,
    private readonly ticketRepo: TicketRepository,
  ) {
    super();
  }

  query() {
    return new TicketQueryBuilder(this.ticketRepo);
  }

  async createTicket(crewRef: SelectCrewChannelDto, ticket?: InsertTicketDto) {
    const crew = await this.crewService.query().byCrew(crewRef).withTeam().getOneOrFail();
    const discordGuild = await this.guildManager.fetch(crew.guild.guildSf);
    const forum = await discordGuild.channels.fetch(crew.team.forumSf);

    if (!forum || !forum.isThreadOnly()) {
      throw new InternalError('INTERNAL_SERVER_ERROR', 'Invalid forum');
    }

    if (!ticket?.name || !ticket.content || !ticket.createdBy) {
      throw new ValidationError('VALIDATION_FAILED', 'Invalid ticket');
    }

    if (!ticket.updatedBy) {
      ticket.updatedBy = ticket.createdBy;
    }

    const prompt = new TicketInfoPromptBuilder().addTicketMessage(ticket, crew);

    if (ticket.previousTicketId) {
      const originalGuildRef = await this.ticketRepo.getOriginalGuild({
        id: ticket.previousTicketId,
      });

      if (originalGuildRef.id !== crew.guildId) {
        const originalGuild = await this.guildService
          .query()
          .byGuild(originalGuildRef)
          .getOneOrFail();
        prompt.addCrossGuildEmbed(originalGuild);
      }
    }

    const thread = await forum.threads.create({
      name: Ticket.makeName(ticket.name, TicketTag.TRIAGE),
      message: prompt.build(),
    });

    const result = await this.ticketRepo.insert({
      ...ticket,
      threadSf: thread.id,
      guildId: crew.guildId,
    });

    return result;
  }

  async moveTicket(ticketRef: SelectTicketDto, ticketOverride: InsertTicketDto) {
    const ticket = await this.query().withDeleted().byTicket(ticketRef).getOneOrFail();
    const targetCrew = await this.crewService
      .query()
      .byCrew({ id: ticketOverride.crewId })
      .getOneOrFail();
    const result = await this.createTicket(
      { crewSf: targetCrew.crewSf },
      {
        name: ticket.name,
        content: ticket.content,
        ...ticketOverride,
        createdBy: ticket.createdBy,
        previousTicketId: ticket.id,
      },
    );

    await this.updateTicket(ticketRef, {
      updatedBy: ticketOverride.updatedBy,
      state: TicketTag.MOVED,
    });
  }

  async deleteTicket(ticketRef: SelectTicketDto, memberRef: Snowflake) {
    const ticket = await this.ticketRepo.findOneOrFail({
      where: ticketRef,
      withDeleted: true,
    });

    const discordGuild = await this.guildManager.fetch(ticket.guild.guildSf);
    const guildMember = await discordGuild.members.fetch(memberRef);
    const forum = await discordGuild.channels.fetch(ticket.crew.team.forumSf);

    if (!forum || !forum.isThreadOnly()) {
      throw new InternalError('INTERNAL_SERVER_ERROR', 'Invalid forum');
    }

    const thread = await forum.threads.fetch(ticket.threadSf);
    const now = new Date();

    const result = await this.ticketRepo.updateReturning(ticketRef, {
      deletedAt: now,
      updatedBy: guildMember.id,
      updatedAt: now,
    });

    // Update thread after database otherwise thread update handler will loop
    await thread.send(new TicketClosedPromptBuilder().addTicketClosedMessage(guildMember).build());
    await thread.edit({ archived: true });

    return result;
  }

  async updateTicket(
    ticketRef: SelectTicketDto,
    update: UpdateTicketDto,
    reason?: string,
  ): Promise<Ticket> {
    if (!update.updatedBy) {
      throw new InternalError('INTERNAL_SERVER_ERROR', 'Ticket updates must provide updatedBy');
    }

    const ticket = await this.query()
      .withDeleted()
      .byTicket(ticketRef)
      .withCrew()
      .withTeam()
      .getOneOrFail();

    const discordGuild = await this.guildManager.fetch(ticket.guild.guildSf);
    const member = await discordGuild.members.fetch(update.updatedBy);
    const forum = await discordGuild.channels.fetch(ticket.crew.team.forumSf);

    if (!forum || !forum.isThreadOnly()) {
      throw new InternalError('INTERNAL_SERVER_ERROR', 'Invalid forum');
    }

    const thread = await forum.threads.fetch(ticket.threadSf);

    const result = await this.ticketRepo.updateReturning(ticketRef, {
      ...update,
      updatedAt: new Date(),
    });

    const postUpdate = update.state !== undefined && ticket.state !== update.state;

    Object.assign(ticket, update);
    await this.refreshTicket(ticket);

    if (postUpdate) {
      const prompt = new TicketUpdatePromptBuilder().addTicketUpdateMessage(member, ticket, reason);
      await thread.send(prompt.build());

      if (
        [TicketTag.DECLINED, TicketTag.ABANDONED, TicketTag.DONE, TicketTag.MOVED].includes(
          ticket.state,
        )
      ) {
        await this.deleteTicket(ticketRef, update.updatedBy);
      }

      if (
        [TicketTag.DONE, TicketTag.ACCEPTED, TicketTag.DECLINED, TicketTag.IN_PROGRESS].includes(
          update.state,
        ) &&
        member.id !== ticket.createdBy
      ) {
        try {
          const creator = await thread.guild.members.fetch(ticket.createdBy);
          const dm = await creator.createDM();
          await dm.send(prompt.build());
        } catch (err) {
          this.logger.error(
            `Failed to DM ticket creator for ${ticket.name} in ${discordGuild.name}: ${err.message}`,
            err.stack,
          );
        }
      }
    }

    if (result?.affected) {
      return (result?.raw as Ticket[]).pop();
    }
  }

  public async refreshTicket(ticket: Ticket) {
    const discordGuild = await this.guildManager.fetch(ticket.guild.guildSf);
    const forum = await discordGuild.channels.fetch(ticket.crew.team.forumSf);

    if (!forum || !forum.isThreadOnly()) {
      throw new InternalError('INTERNAL_SERVER_ERROR', 'Invalid forum');
    }

    const thread = await forum.threads.fetch(ticket.threadSf);
    await thread.edit({ name: ticket.displayName });

    const starterMessage = await thread.fetchStarterMessage();
    switch (ticket.state) {
      case TicketTag.TRIAGE:
        await starterMessage.edit(
          new TicketInfoPromptBuilder()
            .addTriageControls(ticket, { disabled: { accept: ticket.crew.hasMovePrompt } })
            .build(),
        );
        break;

      case TicketTag.ACCEPTED:
        await starterMessage.edit(
          new TicketInfoPromptBuilder().addLifecycleControls(ticket).build(),
        );
        break;

      case TicketTag.DECLINED:
      case TicketTag.ABANDONED:
      case TicketTag.DONE:
      case TicketTag.MOVED:
        await starterMessage.edit({
          components: [],
        });
        break;

      case TicketTag.IN_PROGRESS:
        await starterMessage.edit(
          new TicketInfoPromptBuilder()
            .addLifecycleControls(ticket, { disabled: ['active'] })
            .build(),
        );
        break;

      case TicketTag.QUEUED:
        await starterMessage.edit(
          new TicketInfoPromptBuilder()
            .addLifecycleControls(ticket, { disabled: ['queued'] })
            .build(),
        );
        break;

      case TicketTag.DELIVERY:
        await starterMessage.edit(
          new TicketInfoPromptBuilder()
            .addLifecycleControls(ticket, { disabled: ['delivery'] })
            .build(),
        );
        break;

      case TicketTag.HOLD:
        await starterMessage.edit(
          new TicketInfoPromptBuilder()
            .addLifecycleControls(ticket, { disabled: ['hold'] })
            .build(),
        );
        break;

      case TicketTag.REPEATABLE:
        await starterMessage.edit(
          new TicketInfoPromptBuilder()
            .addLifecycleControls(ticket, {
              disabled: ['queued', 'active', 'delivery', 'repeat', 'close'],
            })
            .build(),
        );
        break;
    }
  }

  public async sendIndividualStatus(
    crewRef: SelectCrewChannelDto,
    targetChannelRef: Snowflake,
    memberRef: Snowflake,
  ) {
    const crew = await this.crewService
      .query()
      .byCrew(crewRef)
      .withTeam()
      .withTickets()
      .withMembers()
      .getOneOrFail();
    const discordGuild = await this.guildManager.fetch(crew.guild.guildSf);

    let crewChannel: GuildBasedChannel;
    try {
      crewChannel = await discordGuild.channels.fetch(crew.crewSf);
    } catch {
      this.logger.warn(`Failed to resolve crew channel for ${crew.name} in ${crew.guild.name}`);
    }

    if (!crewChannel.permissionsFor(memberRef).has(PermissionsBitField.Flags.ViewChannel, true)) {
      throw new AuthError('FORBIDDEN', 'You do not have access to that crew').asDisplayable();
    }

    const targetChannel = await discordGuild.channels.fetch(targetChannelRef);

    if (!targetChannel || !targetChannel.isTextBased()) {
      throw new ValidationError('VALIDATION_FAILED', 'Invalid channel').asDisplayable();
    }

    if (crew.isSecureOnly && !(await this.discordService.isChannelPrivate(targetChannel))) {
      throw new AuthError('FORBIDDEN', 'This channel is not secure').asDisplayable();
    }

    const prompt = new TicketStatusPromptBuilder().addIndividualCrewStatus(discordGuild, crew);

    if (targetChannel.id === crew.crewSf) {
      prompt.add(new CrewInfoPromptBuilder().addCrewControls(crew));
    }

    await targetChannel.send(prompt.build());
  }

  public async sendAllStatus(
    guildRef: SelectGuildDto,
    targetChannelRef: Snowflake,
    memberRef: Snowflake,
  ) {
    const guild = await this.guildService.query().byGuild(guildRef).getOneOrFail();
    const discordGuild = await this.guildManager.fetch(guild.guildSf);
    const member = await discordGuild.members.fetch(memberRef);
    const targetChannel = await discordGuild.channels.fetch(targetChannelRef);

    if (!targetChannel || !targetChannel.isTextBased()) {
      throw new ValidationError('VALIDATION_FAILED', 'Invalid channel').asDisplayable();
    }

    const targetChannelSecure = await this.discordService.isChannelPrivate(targetChannel);
    const srcCrews = await this.crewService
      .query()
      .byGuild(guild)
      .withTeam()
      .withMembers()
      .withTickets()
      .getMany();
    const crews = [];

    for (const crew of srcCrews) {
      let crewChannel: GuildBasedChannel;
      try {
        crewChannel = await discordGuild.channels.fetch(crew.crewSf);
      } catch {
        this.logger.warn(`Failed to resolve crew channel for ${crew.name} in ${crew.guild.name}`);
        continue;
      }

      if (
        !crewChannel.permissionsFor(member).has(PermissionsBitField.Flags.ViewChannel) ||
        (crew.isSecureOnly && !targetChannelSecure)
      ) {
        continue;
      }

      crews.push(crew);
    }

    const prompt = new TicketStatusPromptBuilder().addGlobalCrewStatus(discordGuild, crews);
    await targetChannel.send(prompt.build());
  }
}
