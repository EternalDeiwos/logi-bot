import {
  channelMention,
  EmbedBuilder,
  GuildMember,
  ColorResolvable,
  userMention,
} from 'discord.js';
import { BasePromptBuilder } from 'src/bot/prompt';
import { TicketTag } from 'src/types';
import { Ticket } from './ticket.entity';

export type TicketProperties = {
  color: ColorResolvable;
  action: string;
  title: string;
  tagsRemoved: TicketTag[];
};

export class TicketUpdatePromptBuilder extends BasePromptBuilder {
  addTicketUpdateMessage(
    updatedBy: GuildMember,
    ticket: Ticket,
    properties: TicketProperties,
    reason?: string,
  ) {
    const message =
      reason &&
      reason
        .split('\n')
        .map((r) => `> ${r}`)
        .join('\n');
    const description = `Your ticket ${channelMention(ticket.threadSf)} was ${properties.action} by ${updatedBy}`;
    const embed = new EmbedBuilder()
      .setTitle(properties.title)
      .setColor(properties.color)
      .setDescription(description + ((reason && ` for the following reason:\n\n${message}`) || ''))
      .setThumbnail(updatedBy.avatarURL() ?? updatedBy.user.avatarURL());

    return this.add({
      embeds: [embed],
      content: ticket.createdBy !== updatedBy.id ? userMention(ticket.createdBy) : '',
      allowedMentions: { users: [ticket.createdBy] },
    });
  }
}
