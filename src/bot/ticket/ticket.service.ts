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
  PermissionFlagsBits,
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
import { CrewMemberAccess } from '../crew/crew-member.entity';

export const ticketProperties = {
  [TicketTag.ACCEPTED]: {
    color: 'DarkGreen',
    action: 'accepted',
    title: 'Ticket Accepted',
    tagsRemoved: [
      TicketTag.TRIAGE,
      TicketTag.DECLINED,
      TicketTag.ABANDONED,
      TicketTag.IN_PROGRESS,
      TicketTag.REPEATABLE,
    ],
  },
  [TicketTag.DECLINED]: {
    color: 'DarkRed',
    action: 'declined',
    title: 'Ticket Declined',
    tagsRemoved: [TicketTag.TRIAGE, TicketTag.ACCEPTED, TicketTag.ABANDONED, TicketTag.DONE],
  },
  [TicketTag.ABANDONED]: {
    color: 'LightGrey',
    action: 'closed',
    title: 'Ticket Abandoned',
    tagsRemoved: [TicketTag.DONE, TicketTag.DECLINED],
  },
  [TicketTag.DONE]: {
    color: 'DarkGreen',
    action: 'completed',
    title: 'Ticket Done',
    tagsRemoved: [
      TicketTag.IN_PROGRESS,
      TicketTag.REPEATABLE,
      TicketTag.ABANDONED,
      TicketTag.DECLINED,
    ],
  },
  [TicketTag.IN_PROGRESS]: {
    color: 'DarkGold',
    action: 'started',
    title: 'In Progress',
    tagsRemoved: [TicketTag.REPEATABLE, TicketTag.DONE, TicketTag.ABANDONED],
  },
  [TicketTag.REPEATABLE]: {
    color: 'Aqua',
    action: 'marked repeatable',
    title: 'Repeatable Ticket / Chore',
    tagsRemoved: [TicketTag.IN_PROGRESS, TicketTag.DONE, TicketTag.ABANDONED],
  },
};

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

  async getOpenTickets(channelRef: GuildChannelResolvable) {
    return this.ticketRepo.find({
      where: { discussion: typeof channelRef === 'string' ? channelRef : channelRef.id },
    });
  }

  async getTickets(channelRef: GuildChannelResolvable) {
    return this.ticketRepo.find({
      where: { discussion: typeof channelRef === 'string' ? channelRef : channelRef.id },
      withDeleted: true,
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
    const channel = await guild.channels.fetch(
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

    const forum = await guild.channels.fetch(crew.team.forum);

    if (!forum || !forum.isThreadOnly()) {
      return { success: false, message: `${roleMention(crew.role)} does not have a forum` };
    }

    const triageTag = await crew.team.resolveSnowflakeFromTag(TicketTag.TRIAGE);
    const crewTag = await crew.getCrewTag();
    const appliedTags: string[] = [];

    if (triageTag) {
      appliedTags.push(triageTag);
    }

    if (crewTag) {
      appliedTags.push(crewTag.tag);
    }

    const prompt = new EmbedBuilder()
      .setColor('DarkGold')
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
    const thread = await guild.channels.fetch(
      typeof threadRef === 'string' ? threadRef : threadRef.id,
    );

    if (!thread.isThread()) {
      this.logger.warn(
        `Failed to add move prompt to ticket: ${thread.name} (${thread.id}) is not a thread.`,
      );
      return;
    }

    const channel = await guild.channels.fetch(
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
      components: [
        await this.createMovePrompt(thread, channel),
        this.createTriageControl(thread, { accept: true }),
      ],
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
    const thread = await guild.channels.fetch(
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
      components: [this.createTriageControl(thread)],
    });
  }

  createTriageControl(
    thread: ThreadChannel,
    disabled: { [K in 'accept' | 'decline' | 'close']?: boolean } = {},
  ) {
    const accept = new ButtonBuilder()
      .setCustomId(`ticket/action/accept/${thread.id}`)
      .setLabel('Accept')
      .setDisabled(Boolean(disabled.accept))
      .setStyle(ButtonStyle.Success);

    const decline = new ButtonBuilder()
      // Decline is not an immediate action.
      // There is a form before the action is taken and is therefore handled differently
      .setCustomId(`ticket/reqdecline/${thread.id}`)
      .setLabel('Decline')
      .setDisabled(Boolean(disabled.decline))
      .setStyle(ButtonStyle.Danger);

    const close = new ButtonBuilder()
      .setCustomId(`ticket/action/close/${thread.id}`)
      .setLabel('Close')
      .setDisabled(Boolean(disabled.close))
      .setStyle(ButtonStyle.Secondary);

    return new ActionRowBuilder<ButtonBuilder>().addComponents(decline, accept, close);
  }

  async moveTicket(
    threadRef: ThreadChannelResolvable,
    channelRef: GuildChannelResolvable,
    member: GuildMember,
  ) {
    const guild = member.guild;
    const thread = await guild.channels.fetch(
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

    const creator = await guild.members.fetch(ticket.createdBy);
    const createResult = await this.createTicket(channelRef, creator, ticket.name, ticket.content);

    if (!createResult.success) {
      return createResult;
    }

    return this.deleteTicket(thread, member);
  }

  async deleteTicket(
    threadRef: ThreadChannelResolvable,
    member: GuildMember,
    force: boolean = false,
    deleteThread: boolean = true,
  ): Promise<OperationStatus> {
    const guild = member.guild;
    const thread = await guild.channels.fetch(
      typeof threadRef === 'string' ? threadRef : threadRef.id,
    );

    if (!thread || !thread.isThread()) {
      return { success: false, message: 'Invalid ticket' };
    }

    const ticket = await this.getTicket(thread);

    if (!ticket) {
      return { success: false, message: `${thread} is not a ticket` };
    }

    if (!force && !member.roles.cache.has(ticket.crew.role)) {
      return {
        success: false,
        message: `You do not have the ${roleMention(ticket.crew.role)} role.`,
      };
    }

    const reason = `${member} has triaged this ticket`;
    const now = new Date();

    if (deleteThread) {
      await thread.delete(reason);
    } else {
      const embed = new EmbedBuilder()
        .setTitle('Ticket Closed')
        .setColor('DarkRed')
        .setDescription(`Your ticket was closed by ${member}`)
        .setThumbnail(member.avatarURL() ?? member.user.avatarURL());

      await thread.send({ embeds: [embed] });
      await thread.setLocked(true);
      await thread.setArchived(true);
    }

    if (force) {
      await this.ticketRepo.softDelete({ thread: thread.id });
    } else {
      await this.ticketRepo.update(
        { thread: thread.id },
        {
          deletedAt: now,
          updatedBy: member.id,
          updatedAt: now,
        },
      );
    }

    return { success: true, message: 'Done' };
  }

  getActiveTicketControls(
    thread: ThreadChannel,
    disabled: { [K in 'active' | 'repeat' | 'done' | 'close']?: boolean } = {},
  ) {
    const inProgress = new ButtonBuilder()
      .setCustomId(`ticket/action/active/${thread.id}`)
      .setLabel('In Progress')
      .setDisabled(Boolean(disabled.active))
      .setStyle(ButtonStyle.Primary);

    const repeatable = new ButtonBuilder()
      .setCustomId(`ticket/action/repeat/${thread.id}`)
      .setLabel('Repeatable')
      .setDisabled(Boolean(disabled.repeat))
      .setStyle(ButtonStyle.Secondary);

    const done = new ButtonBuilder()
      .setCustomId(`ticket/action/done/${thread.id}`)
      .setLabel('Done')
      .setDisabled(Boolean(disabled.done))
      .setStyle(ButtonStyle.Success);

    const close = new ButtonBuilder()
      .setCustomId(`ticket/action/close/${thread.id}`)
      .setLabel('Close')
      .setDisabled(Boolean(disabled.close))
      .setStyle(ButtonStyle.Danger);

    return new ActionRowBuilder<ButtonBuilder>().addComponents(inProgress, repeatable, done, close);
  }

  async updateTicket(
    thread: ThreadChannel,
    member: GuildMember,
    tag: TicketTag,
    reason?: string,
  ): Promise<OperationStatus<string>> {
    const forum = thread.parent;
    const ticket = await this.getTicket(thread.id);

    if (!ticket) {
      return { success: false, message: 'Invalid ticket' };
    }

    if (!forum.isThreadOnly()) {
      return { success: false, message: 'Invalid forum' };
    }

    const crew = await this.crewService.getCrew(ticket.discussion, { withDeleted: true });
    const crewMember = await this.crewService.getCrewMember(crew.channel, member);
    const isAdmin = member.permissions.has(PermissionFlagsBits.Administrator);

    // RBAC for ticket lifecycle changes
    if (tag === TicketTag.ABANDONED) {
      // OP is allowed to close their own tickets
      if (!crewMember && thread.ownerId !== member.id && !isAdmin) {
        return { success: false, message: 'You are not a member of this crew' };
      }

      if (
        crewMember &&
        crewMember.access > CrewMemberAccess.MEMBER &&
        thread.ownerId !== member.id &&
        !isAdmin
      ) {
        return { success: false, message: 'Only crew members can perform this action' };
      }
    } else {
      if (!crewMember && !isAdmin) {
        return { success: false, message: 'You are not a member of this crew' };
      }

      if (crewMember.access > CrewMemberAccess.MEMBER && !isAdmin) {
        return { success: false, message: 'Only crew members can perform this action' };
      }
    }

    await this.ticketRepo.update(
      { thread: ticket.thread },
      { updatedAt: new Date(), updatedBy: member.id },
    );
    // await this.ticketRepo.save(ticket);

    const { title, color, action, tagsRemoved } = ticketProperties[tag];
    const tagSnowflakeMap = await crew.team.getSnowflakeMap();
    const tagsRemovedSf = tagsRemoved.map((tagName) => tagSnowflakeMap[tagName]);
    const tagAdd = tagSnowflakeMap[tag];

    const message =
      reason &&
      reason
        .split('\n')
        .map((r) => `> ${r}`)
        .join('\n');
    const description = `Your ticket ${channelMention(thread.id)} was ${action} by ${member}`;
    const embed = new EmbedBuilder()
      .setTitle(title)
      .setColor(color)
      .setDescription(description + ((reason && ` for the following reason:\n\n${message}`) || ''))
      .setThumbnail(member.avatarURL() ?? member.user.avatarURL());

    await thread.send({
      content: ticket.createdBy !== member.id ? userMention(ticket.createdBy) : '',
      allowedMentions: { users: [ticket.createdBy] },
      embeds: [embed],
    });

    const starterMessage = await thread.fetchStarterMessage();
    switch (tag) {
      case TicketTag.TRIAGE:
        await starterMessage.edit({
          components: [this.createTriageControl(thread)],
        });
        break;

      case TicketTag.ACCEPTED:
        await starterMessage.edit({
          components: [this.getActiveTicketControls(thread)],
        });
        break;

      case TicketTag.DECLINED:
      case TicketTag.ABANDONED:
      case TicketTag.DONE:
        await starterMessage.edit({
          components: [],
        });
        break;

      case TicketTag.IN_PROGRESS:
        await starterMessage.edit({
          components: [this.getActiveTicketControls(thread, { active: true })],
        });
        break;

      case TicketTag.REPEATABLE:
        await starterMessage.edit({
          components: [
            this.getActiveTicketControls(thread, { active: true, repeat: true, close: true }),
          ],
        });
        break;
    }

    await thread.setAppliedTags([
      ...thread.appliedTags.filter((tag) => !tagsRemovedSf.includes(tag)),
      tagAdd,
    ]);

    return { success: true, message: 'Done' };
  }
}
