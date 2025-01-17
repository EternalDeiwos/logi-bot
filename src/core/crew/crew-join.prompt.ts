import {
  EmbedBuilder,
  ColorResolvable,
  Colors,
  GuildMember,
  userMention,
  inlineCode,
} from 'discord.js';
import { BasePromptBuilder } from 'src/bot/prompt';
import { TicketTag } from 'src/types';
import { Crew } from 'src/core/crew/crew.entity';

export type TicketProperties = {
  color: ColorResolvable;
  action: string;
  title: string;
  tagsRemoved: TicketTag[];
};

export class CrewJoinPromptBuilder extends BasePromptBuilder {
  addJoinMessage(crew: Crew, guildMember: GuildMember) {
    const embed = new EmbedBuilder()
      .setTitle(`${guildMember.displayName} has joined ${crew.name}`)
      .setColor(Colors.DarkGreen)
      .setThumbnail(guildMember.avatarURL() ?? guildMember.user.avatarURL())
      .setTimestamp()
      .setDescription(
        `Welcome to ${crew.name}, ${userMention(guildMember.user.id)}!\n\nYou can leave again at any time by running ${inlineCode('/echo crew leave')}.\n\nDon't forget to check the pins for important information.`,
      );

    return this.add({
      embeds: [embed],
      allowedMentions: { users: [guildMember.user.id] },
    });
  }
}
