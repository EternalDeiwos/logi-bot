import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DeepPartial, Repository } from 'typeorm';
import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  Guild,
  GuildBasedChannel,
  GuildChannelResolvable,
  GuildMember,
  StringSelectMenuBuilder,
  ThreadChannel,
  ThreadChannelResolvable,
  channelMention,
  roleMention,
  userMention,
} from 'discord.js';
import { ConfigService } from 'src/config';
import { OperationStatus } from 'src/types';
import { TicketTag } from 'src/bot/tag/tag.service';
import { CrewService } from 'src/bot/crew/crew.service';
import { Ticket } from './ticket.entity';
import { newTicketMessage, ticketTriageMessage } from './ticket.messages';

@Injectable()
export class TicketService {
  private readonly logger = new Logger(TicketService.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly crewService: CrewService,
    @InjectRepository(Ticket) private readonly ticketRepo: Repository<Ticket>,
  ) {}

  async getTicket(threadRef: ThreadChannelResolvable) {
    return this.ticketRepo.findOne({
      where: { thread: typeof threadRef === 'string' ? threadRef : threadRef.id },
    });
  }

  async createTicket(
    channelRef: GuildChannelResolvable,
    member: GuildMember,
    title: string,
    content: string,
    extra: DeepPartial<Ticket> = {},
  ): Promise<OperationStatus> {
    const guild = member.guild;
    const channel = guild.channels.cache.get(
      typeof channelRef === 'string' ? channelRef : channelRef.id,
    );

    if (!channel) {
      return { success: false, message: 'Invalid channel' };
    }

    let crew = await this.crewService.getCrew(channel);

    if (!crew) {
      crew = await this.crewService.getFirstCrew(guild);

      if (!crew) {
        return { success: false, message: `${channel} does not belong to a crew` };
      }
    }

    const forum = guild.channels.cache.get(crew.team.forum);

    if (!forum || !forum.isThreadOnly()) {
      return { success: false, message: `${roleMention(crew.role)} does not have a forum` };
    }

    const triageTag = await crew.team.findTag(TicketTag.TRIAGE);
    const crewTag = await crew.getCrewTag();
    const appliedTags: string[] = [];

    if (triageTag) {
      appliedTags.push(triageTag);
    }

    if (crewTag) {
      appliedTags.push(crewTag.tag);
    }

    const prompt = new EmbedBuilder()
      .setColor(0x333333)
      .setTitle('New Ticket')
      .setDescription(ticketTriageMessage(member.id, crew.role));

    const thread = await forum.threads.create({
      name: title,
      message: {
        content: newTicketMessage(content, member.id, crew.role),
        embeds: [prompt],
        allowedMentions: { users: [member.id], roles: [crew.role] },
      },
      appliedTags,
    });

    await this.ticketRepo.insert({
      thread: thread.id,
      guild: guild.id,
      discussion: crew.channel,
      name: title,
      content,
      createdBy: member.id,
      updatedBy: member.id,
      ...extra,
    });

    if (crew.movePrompt) {
      await this.addMovePromptToThread(guild, thread, crew.channel);
    }

    return { success: true, message: 'Done' };
  }

  async addMovePromptToThread(
    guild: Guild,
    threadRef: ThreadChannel | ThreadChannelResolvable,
    channelRef: GuildChannelResolvable,
  ) {
    const thread = await guild.channels.cache.get(
      typeof threadRef === 'string' ? threadRef : threadRef.id,
    );

    if (!thread.isThread()) {
      this.logger.warn(
        `Failed to add move prompt to ticket: ${thread.name} (${thread.id}) is not a thread.`,
      );
      return;
    }

    const channel = await guild.channels.cache.get(
      typeof channelRef === 'string' ? channelRef : channelRef.id,
    );

    if (!channel) {
      this.logger.warn(`Failed to find channel ${channelRef}`);
      return;
    }

    const crew = await this.crewService.getCrew(channel);

    if (!crew) {
      this.logger.warn(`Failed to find crew for channel ${channel.name} (${channel.id})`);
      return;
    }

    const message = await thread.fetchStarterMessage();
    await message.edit({
      components: [await this.createMovePrompt(thread, channel)],
    });
  }

  async createMovePrompt(thread: ThreadChannel, channel: GuildBasedChannel) {
    const guild = channel.guild;

    const crews = (await this.crewService.getCrews(guild)).filter(
      (crew) => crew.channel !== channel.id,
    );

    const select = new StringSelectMenuBuilder()
      .setCustomId(`ticket/move/${thread.id}`)
      .setPlaceholder('Select a crew')
      .setOptions(
        crews.map((crew) => ({ label: `${crew.team.name}: ${crew.name}`, value: crew.channel })),
      );

    return new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(select);
  }

  async addTriageControlToThread(guild: Guild, threadRef: ThreadChannel | ThreadChannelResolvable) {
    const thread = await guild.channels.cache.get(
      typeof threadRef === 'string' ? threadRef : threadRef.id,
    );

    if (!thread.isThread()) {
      this.logger.warn(
        `Failed to add triage controls to ticket: ${thread.name} (${thread.id}) is not a thread.`,
      );
      return;
    }

    const message = await thread.fetchStarterMessage();
    await message.edit({
      components: [await this.createTriageControl(thread)],
    });
  }

  async createTriageControl(thread: ThreadChannel) {
    const accept = new ButtonBuilder()
      .setCustomId(`ticket/accept/${thread.id}`)
      .setLabel('Accept')
      .setStyle(ButtonStyle.Success);

    const decline = new ButtonBuilder()
      .setCustomId(`ticket/reqdecline/${thread.id}`)
      .setLabel('Decline')
      .setStyle(ButtonStyle.Danger);

    return new ActionRowBuilder<ButtonBuilder>().addComponents(accept, decline);
  }

  async moveTicket(
    threadRef: ThreadChannelResolvable,
    channelRef: GuildChannelResolvable,
    member: GuildMember,
  ) {
    const guild = member.guild;
    const thread = await guild.channels.cache.get(
      typeof threadRef === 'string' ? threadRef : threadRef.id,
    );

    if (!thread || !thread.isThread()) {
      return { success: false, message: 'Invalid ticket' };
    }

    const ticket = await this.getTicket(thread);

    if (!ticket) {
      return { success: false, message: `${thread} is not a ticket` };
    }

    if (!member.roles.cache.has(ticket.crew.role)) {
      return {
        success: false,
        message: `You do not have the ${roleMention(ticket.crew.role)} role.`,
      };
    }

    const creator = await guild.members.cache.get(ticket.createdBy);
    const createResult = await this.createTicket(channelRef, creator, ticket.name, ticket.content);

    if (!createResult.success) {
      return createResult;
    }

    return this.deleteTicket(thread, member);
  }

  async deleteTicket(
    threadRef: ThreadChannelResolvable,
    member: GuildMember,
  ): Promise<OperationStatus> {
    const guild = member.guild;
    const thread = await guild.channels.cache.get(
      typeof threadRef === 'string' ? threadRef : threadRef.id,
    );

    if (!thread || !thread.isThread()) {
      return { success: false, message: 'Invalid ticket' };
    }

    const ticket = await this.getTicket(thread);

    if (!ticket) {
      return { success: false, message: `${thread} is not a ticket` };
    }

    if (!member.roles.cache.has(ticket.crew.role)) {
      return {
        success: false,
        message: `You do not have the ${roleMention(ticket.crew.role)} role.`,
      };
    }

    const reason = `${member} has triaged this ticket`;
    const now = new Date();

    await thread.delete(reason);
    await this.ticketRepo.update(
      { thread: thread.id },
      {
        deletedAt: now,
        updatedBy: member.id,
        updatedAt: now,
      },
    );

    return { success: true, message: 'Done' };
  }

  async acceptTicket(
    threadRef: ThreadChannelResolvable,
    member: GuildMember,
  ): Promise<OperationStatus> {
    const guild = member.guild;
    const thread = await guild.channels.cache.get(
      typeof threadRef === 'string' ? threadRef : threadRef.id,
    );

    if (!thread || !thread.isThread()) {
      return { success: false, message: 'Invalid ticket' };
    }

    const ticket = await this.getTicket(thread);

    if (!ticket) {
      return { success: false, message: `${thread} is not a ticket` };
    }

    if (!member.roles.cache.has(ticket.crew.role)) {
      return {
        success: false,
        message: `You do not have the ${roleMention(ticket.crew.role)} role.`,
      };
    }

    const embed = new EmbedBuilder()
      .setTitle('Ticket Accepted')
      .setColor(0x22fa22)
      .setDescription(`Your ticket ${channelMention(thread.id)} was accepted by ${member}`)
      .setThumbnail(guild.iconURL({ extension: 'png', forceStatic: true }));

    const tags = await ticket.crew.team.tags;
    const triageTag = tags.find((tag) => tag.name === TicketTag.TRIAGE);
    const acceptedTag = tags.find((tag) => tag.name === TicketTag.ACCEPTED);
    await thread.setAppliedTags([
      ...thread.appliedTags.filter((tag) => tag !== triageTag?.tag),
      acceptedTag?.tag,
    ]);

    await thread.send({
      content: userMention(ticket.createdBy),
      allowedMentions: { users: [ticket.createdBy] },
      embeds: [embed],
    });

    const message = await thread.fetchStarterMessage();
    await message.edit({ components: [] });

    const now = new Date();
    await this.ticketRepo.update(
      { thread: thread.id },
      {
        updatedBy: member.id,
        updatedAt: now,
      },
    );

    return { success: true, message: 'Done' };
  }

  async declineTicket(
    threadRef: ThreadChannelResolvable,
    reason: string,
    member: GuildMember,
  ): Promise<OperationStatus> {
    const guild = member.guild;
    const thread = await guild.channels.cache.get(
      typeof threadRef === 'string' ? threadRef : threadRef.id,
    );

    if (!thread || !thread.isThread()) {
      return { success: false, message: 'Invalid ticket' };
    }

    const ticket = await this.getTicket(thread);

    if (!ticket) {
      return { success: false, message: `${thread} is not a ticket` };
    }

    if (!member.roles.cache.has(ticket.crew.role)) {
      return {
        success: false,
        message: `You do not have the ${roleMention(ticket.crew.role)} role.`,
      };
    }

    const message = reason
      .split('\n')
      .map((r) => `> ${r}`)
      .join('\n');
    const embed = new EmbedBuilder()
      .setTitle('Ticket Declined')
      .setColor('DarkRed')
      .setDescription(
        `Your ticket ${channelMention(thread.id)} was declined by ${member} for the following reason:\n\n${message}`,
      )
      .setThumbnail(guild.iconURL());

    const tags = await ticket.crew.team.tags;
    const triageTag = tags.find((tag) => tag.name === TicketTag.TRIAGE);
    const declinedTag = tags.find((tag) => tag.name === TicketTag.DECLINED);
    await thread.setAppliedTags([
      ...thread.appliedTags.filter((tag) => tag !== triageTag?.tag),
      declinedTag?.tag,
    ]);

    await thread.send({
      content: userMention(ticket.createdBy),
      allowedMentions: { users: [ticket.createdBy] },
      embeds: [embed],
    });

    const now = new Date();
    await this.ticketRepo.update(
      { thread: thread.id },
      {
        deletedAt: now,
        updatedBy: member.id,
        updatedAt: now,
      },
    );

    return { success: true, message: 'Done' };
  }
}
