import { Colors, EmbedBuilder, GuildMember } from 'discord.js';
import { BasePromptBuilder } from 'src/bot/prompt';
import { Crew } from './crew.entity';

export class CrewDeletePromptBuilder extends BasePromptBuilder {
  addCrewDeleteMessage(crew: Crew, member: GuildMember, reason: string) {
    const message = reason
      .split('\n')
      .map((r) => `> ${r}`)
      .join('\n');

    const embed = new EmbedBuilder()
      .setTitle('Crew Removed')
      .setColor(Colors.DarkRed)
      .setDescription(
        `Crew **${crew.name}** was removed by ${member} for the following reason:\n\n${message}`,
      )
      .setThumbnail(member.avatarURL() ?? member.user.avatarURL());

    return this.add({ embeds: [embed] });
  }
}
