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
import { Crew } from './crew.entity';

export type TicketProperties = {
  color: ColorResolvable;
  action: string;
  title: string;
  tagsRemoved: TicketTag[];
};

export class CrewStatusPromptBuilder extends BasePromptBuilder {
  addIndividualCrewStatus(discordGuild: DiscordGuild, crew: Crew) {
    const fields: { name: string; value: string }[] = [];
    const owner = crew.members.find((member) => member.access === CrewMemberAccess.OWNER);
    const embed = new EmbedBuilder()
      .setTitle(`Crew: ${crew.name}`)
      .setColor(Colors.DarkGreen)
      .setThumbnail(discordGuild.iconURL())
      .setTimestamp()
      .setDescription(
        `${channelMention(crew.crewSf)} is led by ${owner ? userMention(owner.memberSf) : 'nobody'}.`,
      );

    if (crew.members.length > 30) {
      embed.setDescription(
        `${channelMention(crew.crewSf)} is led by ${owner ? userMention(owner.memberSf) : 'nobody'} and has ${crew.members.length} ${crew.members.length > 1 || !crew.members.length ? 'members' : 'member'}.`,
      );
    } else {
      fields.push({
        name: 'Members',
        value:
          crew.members.map((member) => `- ${userMention(member.memberSf)}`).join('\n') || 'None',
      });
    }

    if (crew.logs.length) {
      const { crewSf: channel } = crew;
      const { content, messageSf: message } = crew.logs.pop();
      const redirectText = `See the full status here: ${messageLink(channel, message)}`;
      const value =
        content?.length > 400 ? `${content.substring(0, 400)}...\n\n${redirectText}` : content;

      if (value) {
        fields.push({
          name: 'Status',
          value,
        });
      }
    }

    embed.addFields(...fields);

    return this.add({
      embeds: [embed],
    });
  }

  addGlobalCrewStatus(discordGuild: DiscordGuild, crews: Crew[]) {
    const embed = new EmbedBuilder()
      .setTitle('Crew Status')
      .setColor(Colors.DarkGreen)
      .setThumbnail(discordGuild.iconURL())
      .setTimestamp();

    const crewSummary: string[] = [];
    const fields: { name: string; value: string }[] = [];

    for (const crew of crews) {
      const owner = crew.members.find((member) => member.access === CrewMemberAccess.OWNER);

      crewSummary.push(
        `- ${channelMention(crew.crewSf)} (${crew.members.length} members) led by ${owner ? userMention(owner.memberSf) : 'nobody'}`,
      );

      for (const ticket of crew.tickets) {
        crewSummary.push(`  - ${channelMention(ticket.threadSf)}`);
      }
    }

    const content = crewSummary.join('\n');
    if (content.length) {
      embed.setDescription(content);
    } else {
      embed.setDescription('None');
    }

    embed.addFields(...fields);

    return this.add({ embeds: [embed] });
  }
}
