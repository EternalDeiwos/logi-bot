import { forwardRef, Inject, Injectable, Logger } from '@nestjs/common';
import { uniq } from 'lodash';
import { InsertResult } from 'typeorm';
import { GuildManager, PermissionsBitField, Snowflake } from 'discord.js';
import { AuthError, InternalError, ValidationError } from 'src/errors';
import { DiscordService } from 'src/bot/discord.service';
import { GuildService } from 'src/core/guild/guild.service';
import { TagService, TicketTag } from 'src/core/tag/tag.service';
import { SelectGuild } from 'src/core/guild/guild.entity';
import { Team } from 'src/core/team/team.entity';
import { CrewInfoPromptBuilder } from 'src/core/crew/crew-info.prompt';
import { CrewService } from 'src/core/crew/crew.service';
import { SelectCrew } from 'src/core/crew/crew.entity';
import { InsertTicket, SelectTicket, Ticket } from './ticket.entity';
import { TicketRepository } from './ticket.repository';
import { TicketInfoPromptBuilder } from './ticket-info.prompt';
import { TicketUpdatePromptBuilder } from './ticket-update.prompt';
import { TicketClosedPromptBuilder } from './ticket-closed.prompt';
import { TicketStatusPromptBuilder } from './ticket-status.prompt';
import { TicketQueryBuilder } from './ticket.query';

export const tagsRemoved: { [K in TicketTag]: TicketTag[] } = {
  [TicketTag.TRIAGE]: [
    TicketTag.ACCEPTED,
    TicketTag.DECLINED,
    TicketTag.ABANDONED,
    TicketTag.IN_PROGRESS,
    TicketTag.REPEATABLE,
    TicketTag.MOVED,
    TicketTag.DONE,
  ],
  [TicketTag.ACCEPTED]: [
    TicketTag.TRIAGE,
    TicketTag.DECLINED,
    TicketTag.ABANDONED,
    TicketTag.IN_PROGRESS,
    TicketTag.REPEATABLE,
    TicketTag.DONE,
    TicketTag.MOVED,
  ],
  [TicketTag.DECLINED]: [
    TicketTag.TRIAGE,
    TicketTag.ACCEPTED,
    TicketTag.ABANDONED,
    TicketTag.DONE,
    TicketTag.MOVED,
  ],
  [TicketTag.ABANDONED]: [TicketTag.DONE, TicketTag.DECLINED, TicketTag.MOVED],
  [TicketTag.DONE]: [
    TicketTag.IN_PROGRESS,
    TicketTag.REPEATABLE,
    TicketTag.ABANDONED,
    TicketTag.DECLINED,
    TicketTag.MOVED,
  ],
  [TicketTag.IN_PROGRESS]: [
    TicketTag.REPEATABLE,
    TicketTag.DONE,
    TicketTag.ABANDONED,
    TicketTag.MOVED,
  ],
  [TicketTag.REPEATABLE]: [
    TicketTag.IN_PROGRESS,
    TicketTag.DONE,
    TicketTag.ABANDONED,
    TicketTag.MOVED,
  ],
  [TicketTag.MOVED]: [
    TicketTag.TRIAGE,
    TicketTag.ACCEPTED,
    TicketTag.DECLINED,
    TicketTag.IN_PROGRESS,
    TicketTag.DONE,
    TicketTag.ABANDONED,
  ],
};

export abstract class TicketService {
  abstract query(): TicketQueryBuilder;
  abstract createTicket(crewRef: SelectCrew, ticket?: InsertTicket): Promise<InsertResult>;
  abstract moveTicket(ticketRef: SelectTicket, ticketOverride: InsertTicket);
  abstract deleteTicket(ticketRef: SelectTicket, memberRef: Snowflake);
  abstract updateTicket(ticket: InsertTicket, tag: TicketTag, reason?: string): Promise<Ticket>;

  abstract sendIndividualStatus(
    crewRef: SelectCrew,
    targetChannelRef: Snowflake,
    memberRef: Snowflake,
  ): Promise<void>;

  abstract sendAllStatus(
    guildRef: SelectGuild,
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
    private readonly tagService: TagService,
    private readonly ticketRepo: TicketRepository,
  ) {
    super();
  }

  query() {
    return new TicketQueryBuilder(this.ticketRepo);
  }

  async createTicket(crewRef: SelectCrew, ticket?: InsertTicket) {
    const crew = await this.crewService
      .query()
      .byCrew(crewRef)
      .withTeam()
      .withTeamTags()
      .withTeamTagsTemplate()
      .getOneOrFail();
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

    const triageTag = crew.team?.tags?.find((tag) => tag.name === TicketTag.TRIAGE);
    const crewTag = crew.team?.tags?.find((tag) => tag.name === crew.shortName);
    const appliedTags: string[] = [];

    if (triageTag) {
      appliedTags.push(triageTag.tagSf);
    }

    if (crewTag) {
      appliedTags.push(crewTag.tagSf);
    }

    const defaultTags = Team.getDefaultTags(crew.team?.tags);
    appliedTags.push(...defaultTags);

    const prompt = new TicketInfoPromptBuilder().addTicketMessage(ticket, crew);

    if (ticket.previousThreadSf) {
      const originalGuildRef = await this.ticketRepo.getOriginalGuild({
        threadSf: ticket.previousThreadSf,
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
      name: ticket.name,
      message: prompt.build(),
      appliedTags,
    });

    const result = await this.ticketRepo.insert({
      ...ticket,
      threadSf: thread.id,
      guildId: crew.guildId,
    });

    return result;
  }

  async moveTicket(ticketRef: SelectTicket, ticketOverride: InsertTicket) {
    const ticket = await this.ticketRepo.findOneOrFail({
      where: ticketRef,
      withDeleted: true,
    });

    const result = await this.createTicket(
      { crewSf: ticketOverride.crewSf },
      {
        name: ticket.name,
        content: ticket.content,
        ...ticketOverride,
        createdBy: ticket.createdBy,
        previousThreadSf: ticket.threadSf,
      },
    );

    await this.updateTicket({ ...ticketRef, updatedBy: ticketOverride.updatedBy }, TicketTag.MOVED);
  }

  async deleteTicket(ticketRef: SelectTicket, memberRef: Snowflake) {
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
    await thread.edit({ locked: true, archived: true });

    return result;
  }

  async updateTicket(data: InsertTicket, tag: TicketTag, reason?: string): Promise<Ticket> {
    if (!data.updatedBy) {
      throw new InternalError('INTERNAL_SERVER_ERROR', 'Ticket updates must provide updatedBy');
    }

    const ticket = await this.query()
      .withDeleted()
      .byThread({ threadSf: data.threadSf })
      .withCrew()
      .withTeam()
      .getOneOrFail();

    const discordGuild = await this.guildManager.fetch(ticket.guild.guildSf);
    const member = await discordGuild.members.fetch(data.updatedBy);
    const forum = await discordGuild.channels.fetch(ticket.crew.team.forumSf);

    if (!forum || !forum.isThreadOnly()) {
      throw new InternalError('INTERNAL_SERVER_ERROR', 'Invalid forum');
    }

    const thread = await forum.threads.fetch(ticket.threadSf);

    const result = await this.ticketRepo.updateReturning(
      { threadSf: data.threadSf },
      { ...data, updatedAt: new Date() },
    );

    const tags = await this.tagService.queryTag().byTeam({ id: ticket.crew.teamId }).getMany();
    const tagSnowflakeMap = Team.getSnowflakeMap(tags);
    const tagsRemovedSf = tagsRemoved[tag].map((tagName) => tagSnowflakeMap[tagName]);
    const tagAdd = tagSnowflakeMap[tag];
    const prompt = new TicketUpdatePromptBuilder().addTicketUpdateMessage(
      member,
      ticket,
      tag,
      reason,
    );

    await thread.send(prompt.build());

    const starterMessage = await thread.fetchStarterMessage();
    switch (tag) {
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

      case TicketTag.REPEATABLE:
        await starterMessage.edit(
          new TicketInfoPromptBuilder()
            .addLifecycleControls(ticket, { disabled: ['active', 'repeat', 'close'] })
            .build(),
        );
        break;
    }

    try {
      await thread.setAppliedTags(
        uniq([...thread.appliedTags.filter((tag) => !tagsRemovedSf.includes(tag)), tagAdd]),
      );
    } catch (err) {
      this.logger.error(
        `Failed to apply tags to ${ticket.name} in ${discordGuild.name}: ${err.message}`,
        err.stack,
      );
    }

    if (
      [TicketTag.DONE, TicketTag.ACCEPTED, TicketTag.DECLINED, TicketTag.IN_PROGRESS].includes(
        tag,
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

    if (result?.affected) {
      return (result?.raw as Ticket[]).pop();
    }
  }

  public async sendIndividualStatus(
    crewRef: SelectCrew,
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
    const crewChannel = await discordGuild.channels.fetch(crew.crewSf);

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
      prompt.add(new CrewInfoPromptBuilder().addCrewControls());
    }

    await targetChannel.send(prompt.build());
  }

  public async sendAllStatus(
    guildRef: SelectGuild,
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
      const crewChannel = await discordGuild.channels.fetch(crew.crewSf);

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
