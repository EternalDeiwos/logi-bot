import { Injectable, Logger } from '@nestjs/common';
import { DeepPartial } from 'typeorm';
import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  Guild,
  GuildManager,
  GuildMember,
  Snowflake,
  StringSelectMenuBuilder,
  ThreadChannel,
  channelMention,
  userMention,
} from 'discord.js';
import { ConfigService } from 'src/config';
import { DeleteOptions } from 'src/types';
import { OperationStatus } from 'src/util';
import { TicketTag } from 'src/bot/tag/tag.service';
import { CrewService } from 'src/bot/crew/crew.service';
import { CrewRepository } from 'src/bot/crew/crew.repository';
import { CrewMemberAccess } from 'src/bot/crew/member/crew-member.entity';
import { CrewMemberService } from 'src/bot/crew/member/crew-member.service';
import { CrewMemberRepository } from 'src/bot/crew/member/crew-member.repository';
import { TeamService } from 'src/bot/team/team.service';
import { Ticket } from './ticket.entity';
import { TicketRepository } from './ticket.repository';
import { newTicketMessage, ticketTriageMessage } from './ticket.messages';
import { uniq } from 'lodash';

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
      TicketTag.MOVED,
    ],
  },
  [TicketTag.DECLINED]: {
    color: 'DarkRed',
    action: 'declined',
    title: 'Ticket Declined',
    tagsRemoved: [
      TicketTag.TRIAGE,
      TicketTag.ACCEPTED,
      TicketTag.ABANDONED,
      TicketTag.DONE,
      TicketTag.MOVED,
    ],
  },
  [TicketTag.ABANDONED]: {
    color: 'LightGrey',
    action: 'closed',
    title: 'Ticket Abandoned',
    tagsRemoved: [TicketTag.DONE, TicketTag.DECLINED, TicketTag.MOVED],
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
      TicketTag.MOVED,
    ],
  },
  [TicketTag.IN_PROGRESS]: {
    color: 'DarkGold',
    action: 'started',
    title: 'In Progress',
    tagsRemoved: [TicketTag.REPEATABLE, TicketTag.DONE, TicketTag.ABANDONED, TicketTag.MOVED],
  },
  [TicketTag.REPEATABLE]: {
    color: 'Aqua',
    action: 'marked repeatable',
    title: 'Repeatable Ticket / Chore',
    tagsRemoved: [TicketTag.IN_PROGRESS, TicketTag.DONE, TicketTag.ABANDONED, TicketTag.MOVED],
  },
  [TicketTag.MOVED]: {
    color: 'Aqua',
    action: 'moved',
    title: 'Moved',
    tagsRemoved: [
      TicketTag.TRIAGE,
      TicketTag.ACCEPTED,
      TicketTag.DECLINED,
      TicketTag.IN_PROGRESS,
      TicketTag.DONE,
      TicketTag.ABANDONED,
    ],
  },
};

@Injectable()
export class TicketService {
  private readonly logger = new Logger(TicketService.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly guildManager: GuildManager,
    private readonly crewService: CrewService,
    private readonly crewRepo: CrewRepository,
    private readonly memberService: CrewMemberService,
    private readonly memberRepo: CrewMemberRepository,
    private readonly teamService: TeamService,
    private readonly ticketRepo: TicketRepository,
  ) {}

  async resolveTicketGuild(ticket: Ticket): Promise<OperationStatus<Guild>> {
    try {
      const guild = await this.guildManager.fetch(ticket.guild);
      return new OperationStatus({ success: true, message: 'Done', data: guild });
    } catch (err) {
      this.logger.error(`Failed to resolve guild: ${err.message}`, err.stack);
      return {
        success: false,
        message: 'Guild is improperly registered. Please report this incident.',
      };
    }
  }

  async resolveTicketThread(ticket: Ticket): Promise<OperationStatus<ThreadChannel>> {
    const { data: guild, ...guildResult } = await this.resolveTicketGuild(ticket);

    if (!guildResult.success) {
      return guildResult;
    }

    try {
      const thread = await guild.channels.fetch(ticket.thread);

      if (!thread || !thread.isThread()) {
        return {
          success: false,
          message: `${ticket.name} does not have a thread. Please report this incident.`,
        };
      }

      return new OperationStatus({ success: true, message: 'Done', data: thread });
    } catch (err) {
      this.logger.error(
        `Failed to fetch thread ${ticket.thread} for ${ticket.name} in ${guild.name}: ${err.message}`,
        err.stack,
      );
      return {
        success: false,
        message: `${ticket.name} does not have a thread. Please report this incident.`,
      };
    }
  }

  async createTicket(
    crewRef: Snowflake,
    memberRef: Snowflake,
    ticket: DeepPartial<Pick<Ticket, 'name' | 'content' | 'createdBy'>> = {},
  ): Promise<OperationStatus> {
    const crew = await this.crewRepo.findOne({ where: { channel: crewRef }, withDeleted: true });

    if (!crew) {
      return { success: false, message: `Channel does not belong to a crew` };
    }

    const { data: guild, ...crewResult } = await this.crewService.resolveCrewGuild(crew);

    if (!crewResult.success) {
      return crewResult;
    }

    // Resolve Crew Forum
    // TODO: DRY
    const { data: forum, ...forumResult } = await this.teamService.resolveTeamForum(crew.team);

    if (!forumResult.success) {
      return forumResult;
    }

    if (!ticket?.name || !ticket.content || !ticket.createdBy) {
      this.logger.debug(
        `Invalid ticket submitted for channel ${crewRef} in ${guild.name} by ${ticket?.createdBy ?? memberRef}`,
        ticket,
      );
      return { success: false, message: 'Invalid ticket' };
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

    const defaultTags = await crew.team.getDefaultTags();
    appliedTags.push(...defaultTags);

    const prompt = new EmbedBuilder()
      .setColor('DarkGold')
      .setTitle('New Ticket')
      .setDescription(ticketTriageMessage(ticket.createdBy, crew.role));

    const thread = await forum.threads.create({
      name: ticket.name,
      message: {
        content: newTicketMessage(ticket.content, ticket.createdBy, crew.role),
        embeds: [prompt],
        allowedMentions: { users: [ticket.createdBy], roles: [crew.role] },
      },
      appliedTags,
    });

    await this.ticketRepo.insert({
      ...ticket,
      thread: thread.id,
      guild: guild.id,
      discussion: crew.channel,
      updatedBy: memberRef,
    });

    if (crew.movePrompt) {
      await this.addMovePromptToTicket(thread);
    }

    return OperationStatus.SUCCESS;
  }

  async addMovePromptToTicket(thread: ThreadChannel) {
    const ticket = await this.ticketRepo.findOne({
      where: { thread: thread.id },
      withDeleted: true,
    });

    if (!ticket) {
      return { success: false, message: `${thread.name} is not a ticket` };
    }

    const message = await thread.fetchStarterMessage();
    await message.edit({
      components: [
        await this.createMovePrompt(ticket, [ticket.crew.channel]),
        this.createTriageControl(ticket, { accept: true }),
      ],
    });
  }

  async createMovePrompt(ticket: Ticket, exclude: Snowflake[] = []) {
    const crews = (await this.crewRepo.getShared(ticket.guild, true).getMany()).filter(
      (crew) => !exclude.includes(crew.channel),
    );

    const select = new StringSelectMenuBuilder()
      .setCustomId(`ticket/move/${ticket.thread}`)
      .setPlaceholder('Select a crew')
      .setOptions(
        crews.map((crew) => {
          const teamName =
            crew.parent.guild !== ticket.guild
              ? `[${crew.parent.shortName}] ${crew.team.name}`
              : crew.team.name;
          return { label: `${teamName}: ${crew.name}`, value: crew.channel };
        }),
      );

    if (!select.options.length) {
      select
        .addOptions({ label: 'placeholder', value: 'placeholder' })
        .setPlaceholder('No crews available')
        .setDisabled(true);
    }

    return new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(select);
  }

  async addTriageControlToThread(thread: ThreadChannel) {
    const ticket = await this.ticketRepo.findOne({
      where: { thread: thread.id },
      withDeleted: true,
    });

    if (!ticket) {
      return { success: false, message: `${thread.name} is not a ticket` };
    }

    const message = await thread.fetchStarterMessage();
    await message.edit({
      components: [this.createTriageControl(ticket)],
    });

    return OperationStatus.SUCCESS;
  }

  createTriageControl(
    ticket: Ticket,
    disabled: { [K in 'accept' | 'decline' | 'close']?: boolean } = {},
  ) {
    const accept = new ButtonBuilder()
      .setCustomId(`ticket/action/accept/${ticket.thread}`)
      .setLabel('Accept')
      .setDisabled(Boolean(disabled.accept))
      .setStyle(ButtonStyle.Success);

    const decline = new ButtonBuilder()
      // Decline is not an immediate action.
      // There is a form before the action is taken and is therefore handled differently
      .setCustomId(`ticket/reqdecline/${ticket.thread}`)
      .setLabel('Decline')
      .setDisabled(Boolean(disabled.decline))
      .setStyle(ButtonStyle.Danger);

    const close = new ButtonBuilder()
      .setCustomId(`ticket/action/close/${ticket.thread}`)
      .setLabel('Close')
      .setDisabled(Boolean(disabled.close))
      .setStyle(ButtonStyle.Secondary);

    return new ActionRowBuilder<ButtonBuilder>().addComponents(decline, accept, close);
  }

  async moveTicket(threadRef: Snowflake, channelRef: Snowflake, memberRef: Snowflake) {
    const ticket = await this.ticketRepo.findOne({
      where: { thread: threadRef },
      withDeleted: true,
    });

    if (!ticket) {
      return { success: false, message: `Thread ${threadRef} is not a ticket` };
    }

    const { data: guild, ...guildResult } = await this.resolveTicketGuild(ticket);

    if (!guildResult.success) {
      return guildResult;
    }

    const { data: member, ...memberResult } = await this.memberService.resolveGuildMember(
      memberRef,
      channelRef,
    );

    if (!memberResult.success) {
      return memberResult;
    }

    const { data: isAdmin, ...adminResult } = await this.memberService.isAdmin(member);

    if (!adminResult.success) {
      return adminResult;
    }

    let crewMember;
    if (!isAdmin) {
      crewMember = await this.memberRepo.findOne({
        where: { channel: channelRef, member: memberRef },
      });

      if (!crewMember || !crewMember.requireAccess(CrewMemberAccess.MEMBER)) {
        return { success: false, message: 'Only crew members can perform this action' };
      }
    }

    const { name, content, createdBy } = ticket;

    const createResult = await this.createTicket(channelRef, memberRef, {
      name,
      content,
      createdBy,
    });

    if (!createResult.success) {
      return createResult;
    }

    return this.updateTicket(ticket.thread, member, TicketTag.MOVED);
  }

  private async _deleteTicket(
    ticket: Ticket,
    guild: Guild,
    guildMember: GuildMember,
    options: Partial<DeleteOptions> = {},
  ): Promise<OperationStatus> {
    const crewMember = await this.memberRepo.findOne({
      where: { channel: ticket.discussion, member: guildMember.id },
    });

    if (
      !options.isAdmin &&
      !options.skipAccessControl &&
      (!crewMember || !crewMember.requireAccess(CrewMemberAccess.MEMBER, options))
    ) {
      return { success: false, message: 'Only crew members can perform this action' };
    }

    const { data: thread, ...threadResult } = await this.resolveTicketThread(ticket);

    if (!threadResult.success) {
      return threadResult;
    }

    const reason = `${guildMember} has triaged this ticket`;
    const now = new Date();

    try {
      if (options.softDelete) {
        const embed = new EmbedBuilder()
          .setTitle('Ticket Closed')
          .setColor('DarkRed')
          .setDescription(`Your ticket was closed by ${guildMember}`)
          .setThumbnail(guildMember.avatarURL() ?? guildMember.user.avatarURL());

        await thread.send({ embeds: [embed] });
        await thread.setLocked(true);
        await thread.setArchived(true);
      } else {
        await thread.delete(reason);
      }
    } catch (err) {
      this.logger.error(
        `Failed to archive ticket ${ticket.name} in ${guild.name}: ${err.message}`,
        err.stack,
      );
      return { success: false, message: 'Failed to archive ticket' };
    }

    await this.ticketRepo.update(
      { thread: ticket.thread },
      {
        deletedAt: now,
        updatedBy: guildMember.id,
        updatedAt: now,
      },
    );

    return OperationStatus.SUCCESS;
  }

  async deleteTicket(
    threadRef: Snowflake,
    member: GuildMember,
    options: Partial<DeleteOptions> = {},
  ): Promise<OperationStatus> {
    const ticket = await this.ticketRepo.findOne({
      where: { thread: threadRef },
      withDeleted: true,
    });

    if (!ticket) {
      return { success: false, message: `Thread ${threadRef} is not a ticket` };
    }

    const { data: guild, ...guildResult } = await this.resolveTicketGuild(ticket);

    if (!guildResult.success) {
      return guildResult;
    }

    const { data: isAdmin, ...adminResult } = await this.memberService.isAdmin(member);

    if (!adminResult.success) {
      return adminResult;
    }

    return this._deleteTicket(ticket, guild, member, { ...options, isAdmin });
  }

  getActiveTicketControls(
    ticket: Ticket,
    disabled: { [K in 'active' | 'repeat' | 'done' | 'close']?: boolean } = {},
  ) {
    const inProgress = new ButtonBuilder()
      .setCustomId(`ticket/action/active/${ticket.thread}`)
      .setLabel('In Progress')
      .setDisabled(Boolean(disabled.active))
      .setStyle(ButtonStyle.Primary);

    const repeatable = new ButtonBuilder()
      .setCustomId(`ticket/action/repeat/${ticket.thread}`)
      .setLabel('Repeatable')
      .setDisabled(Boolean(disabled.repeat))
      .setStyle(ButtonStyle.Secondary);

    const done = new ButtonBuilder()
      .setCustomId(`ticket/action/done/${ticket.thread}`)
      .setLabel('Done')
      .setDisabled(Boolean(disabled.done))
      .setStyle(ButtonStyle.Success);

    const close = new ButtonBuilder()
      .setCustomId(`ticket/action/close/${ticket.thread}`)
      .setLabel('Close')
      .setDisabled(Boolean(disabled.close))
      .setStyle(ButtonStyle.Danger);

    return new ActionRowBuilder<ButtonBuilder>().addComponents(inProgress, repeatable, done, close);
  }

  async updateTicket(
    threadRef: Snowflake,
    member: GuildMember,
    tag: TicketTag,
    reason?: string,
  ): Promise<OperationStatus<string>> {
    const ticket = await this.ticketRepo.findOne({
      where: { thread: threadRef },
      withDeleted: true,
    });

    if (!ticket) {
      return { success: false, message: `Thread ${threadRef} is not a ticket` };
    }

    const { data: guild, ...guildResult } = await this.resolveTicketGuild(ticket);

    if (!guildResult.success) {
      return guildResult;
    }

    const { data: isAdmin, ...adminResult } = await this.memberService.isAdmin(member);

    if (!adminResult.success) {
      return adminResult;
    }

    const { data: thread, ...threadResult } = await this.resolveTicketThread(ticket);

    if (!threadResult.success) {
      return threadResult;
    }

    const crewMember = await this.memberRepo.findOne({
      where: { channel: ticket.crew.channel, member: member.id },
    });

    // RBAC for ticket lifecycle changes
    if (tag === TicketTag.ABANDONED) {
      // OP is allowed to close their own tickets
      if (!crewMember && ticket.createdBy !== member.id && !isAdmin) {
        return { success: false, message: 'Only crew members can perform this action' };
      }

      if (
        crewMember &&
        ticket.createdBy !== member.id &&
        !crewMember.requireAccess(CrewMemberAccess.MEMBER) &&
        !isAdmin
      ) {
        return { success: false, message: 'Only crew members can perform this action' };
      }
    } else {
      if (!crewMember && !isAdmin) {
        return { success: false, message: 'Only crew members can perform this action' };
      }

      if (crewMember && !crewMember.requireAccess(CrewMemberAccess.MEMBER) && !isAdmin) {
        return { success: false, message: 'Only crew members can perform this action' };
      }
    }

    await this.ticketRepo.update(
      { thread: ticket.thread },
      { updatedAt: new Date(), updatedBy: member.id },
    );

    const { title, color, action, tagsRemoved } = ticketProperties[tag];
    const tagSnowflakeMap = await ticket.crew.team.getSnowflakeMap();
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
          components: [this.createTriageControl(ticket)],
        });
        break;

      case TicketTag.ACCEPTED:
        await starterMessage.edit({
          components: [this.getActiveTicketControls(ticket)],
        });
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
        await starterMessage.edit({
          components: [this.getActiveTicketControls(ticket, { active: true })],
        });
        break;

      case TicketTag.REPEATABLE:
        await starterMessage.edit({
          components: [
            this.getActiveTicketControls(ticket, { active: true, repeat: true, close: true }),
          ],
        });
        break;
    }

    try {
      await thread.setAppliedTags(
        uniq([...thread.appliedTags.filter((tag) => !tagsRemovedSf.includes(tag)), tagAdd]),
      );
    } catch (err) {
      this.logger.error(
        `Failed to apply tags to ${ticket.name} in ${guild.name}: ${err.message}`,
        err.stack,
      );
    }

    if (
      [TicketTag.DONE, TicketTag.ACCEPTED, TicketTag.DECLINED, TicketTag.IN_PROGRESS].includes(tag)
    ) {
      try {
        const creator = await thread.guild.members.fetch(ticket.createdBy);
        const dm = await creator.createDM();

        await dm.send({
          embeds: [embed],
        });
      } catch (err) {
        this.logger.error(
          `Failed to DM ticket creator for ${ticket.name} in ${guild.name}: ${err.message}`,
          err.stack,
        );
      }
    }

    return OperationStatus.SUCCESS;
  }
}
