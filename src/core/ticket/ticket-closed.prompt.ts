import { Colors, EmbedBuilder, GuildMember } from 'discord.js';
import { BasePromptBuilder } from 'src/bot/prompt';

export class TicketClosedPromptBuilder extends BasePromptBuilder {
  addTicketClosedMessage(member: GuildMember) {
    const embed = new EmbedBuilder()
      .setTitle('Ticket Closed')
      .setColor(Colors.DarkRed)
      .setDescription(`Your ticket was closed by ${member}`)
      .setThumbnail(member.avatarURL() ?? member.user.avatarURL());

    return this.add({ embeds: [embed] });
  }
}
