import {
  channelMention,
  EmbedBuilder,
  ColorResolvable,
  userMention,
  Colors,
  Guild as DiscordGuild,
  messageLink,
} from 'discord.js';
import { BasePromptBuilder } from 'src/bot/prompt';
import { CrewMemberAccess, TicketTag } from 'src/types';
import { Crew } from 'src/core/crew/crew.entity';

export type TicketProperties = {
  color: ColorResolvable;
  action: string;
  title: string;
  tagsRemoved: TicketTag[];
};

export class TicketStatusPromptBuilder extends BasePromptBuilder {
  addIndividualCrewStatus(discordGuild: DiscordGuild, crew: Crew) {
    const owner = crew.members.find((member) => member.access === CrewMemberAccess.OWNER);
    const embed = new EmbedBuilder()
      .setTitle(`Tickets: ${crew.name}`)
      .setColor(Colors.DarkGreen)
      .setThumbnail(discordGuild.iconURL())
      .setTimestamp()
      .setDescription(
        `${channelMention(crew.crewSf)} is led by ${owner ? userMention(owner.memberSf) : 'nobody'}.`,
      );

    if (crew.tickets.length) {
      embed.setFields([
        {
          name: 'Active Tickets',
          value: crew.tickets
            .map(
              (ticket) =>
                `- ${channelMention(ticket.threadSf)} from ${userMention(ticket.createdBy)}`,
            )
            .join('\n'),
        },
      ]);
    } else {
      embed.setFields([
        {
          name: 'Active Tickets',
          value: 'None',
        },
      ]);
    }

    return this.add({
      embeds: [embed],
    });
  }

  addGlobalCrewStatus(discordGuild: DiscordGuild, crews: Crew[]) {
    const crewSummary: string[] = [];

    for (const crew of crews) {
      const owner = crew.members.find((member) => member.access === CrewMemberAccess.OWNER);
      crewSummary.push(
        `- ${channelMention(crew.crewSf)} is led by ${owner ? userMention(owner.memberSf) : 'nobody'} and has ${crew.members.length} ${crew.members.length > 1 || !crew.members.length ? 'members' : 'member'}.`,
      );

      for (const ticket of crew.tickets) {
        crewSummary.push(`  - ${channelMention(ticket.threadSf)}`);
      }
    }

    const description = crewSummary.join('\n');

    const embed = new EmbedBuilder()
      .setTitle('Crew Status')
      .setColor(Colors.DarkGreen)
      .setThumbnail(discordGuild.iconURL())
      .setDescription(description || 'None')
      .setTimestamp();

    return this.add({ embeds: [embed] });
  }
}
