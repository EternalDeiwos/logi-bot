import {
  channelMention,
  EmbedBuilder,
  GuildMember,
  ColorResolvable,
  userMention,
  Colors,
} from 'discord.js';
import { BasePromptBuilder } from 'src/bot/prompt';
import { TicketTag } from 'src/types';
import { Ticket } from './ticket.entity';

type TicketProperties = {
  color: ColorResolvable;
  action: string;
  title: string;
};

export const ticketProperties: { [K in TicketTag]: TicketProperties } = {
  [TicketTag.TRIAGE]: {
    color: Colors.DarkGreen,
    action: 'returned to triage',
    title: 'Ticket Reset',
  },
  [TicketTag.ACCEPTED]: {
    color: Colors.DarkGreen,
    action: 'accepted',
    title: 'Ticket Accepted',
  },
  [TicketTag.DECLINED]: {
    color: Colors.DarkRed,
    action: 'declined',
    title: 'Ticket Declined',
  },
  [TicketTag.ABANDONED]: {
    color: Colors.LightGrey,
    action: 'closed',
    title: 'Ticket Abandoned',
  },
  [TicketTag.QUEUED]: {
    color: Colors.Blurple,
    action: 'queued',
    title: 'Ordered Queued',
  },
  [TicketTag.DONE]: {
    color: Colors.DarkGreen,
    action: 'completed',
    title: 'Ticket Done',
  },
  [TicketTag.IN_PROGRESS]: {
    color: Colors.DarkGold,
    action: 'started',
    title: 'In Progress',
  },
  [TicketTag.DELIVERY]: {
    color: Colors.DarkGreen,
    action: 'ready for pick up/delivery',
    title: 'Ready for Pick Up/Delivery',
  },
  [TicketTag.HOLD]: {
    color: Colors.DarkOrange,
    action: 'on hold',
    title: 'On Hold',
  },
  [TicketTag.REPEATABLE]: {
    color: Colors.Aqua,
    action: 'marked repeatable',
    title: 'Repeatable Ticket / Chore',
  },
  [TicketTag.MOVED]: {
    color: Colors.Aqua,
    action: 'moved',
    title: 'Moved',
  },
};

export class TicketUpdatePromptBuilder extends BasePromptBuilder {
  addTicketUpdateMessage(updatedBy: GuildMember, ticket: Ticket, reason?: string) {
    const properties = ticketProperties[ticket.state];
    const message =
      reason &&
      reason
        .split('\n')
        .map((r) => `> ${r}`)
        .join('\n');
    const reasonPart = reason ? ` for the following reason:\n\n${message}` : '';
    const mainPart = `Your ticket ${channelMention(ticket.threadSf)} was ${properties.action} by ${updatedBy}`;
    const description = [mainPart, reasonPart].join('');

    const embed = new EmbedBuilder()
      .setTitle(properties.title)
      .setColor(properties.color)
      .setDescription(description)
      .setThumbnail(updatedBy.avatarURL() ?? updatedBy.user.avatarURL());

    if (ticket.state === TicketTag.ACCEPTED) {
      embed.addFields({
        name: 'Responsibility',
        value: 'They are now responsible for this ticket.',
        inline: false,
      });
    }

    return this.add({
      embeds: [embed],
      content: ticket.createdBy !== updatedBy.id ? userMention(ticket.createdBy) : '',
      allowedMentions: { users: [ticket.createdBy] },
    });
  }
}
