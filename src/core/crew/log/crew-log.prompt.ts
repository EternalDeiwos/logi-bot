import { Colors, EmbedBuilder, Guild as DiscordGuild, GuildMember, roleMention } from 'discord.js';
import { BasePromptBuilder } from 'src/bot/prompt';
import { Crew } from 'src/core/crew/crew.entity';

export class CrewLogPromptBuilder extends BasePromptBuilder {
  addCrewDeleteMessage(
    discordGuild: DiscordGuild,
    crew: Crew,
    member: GuildMember,
    content: string,
    createdAt: Date,
  ) {
    const embed = new EmbedBuilder()
      .setTitle(`Crew Update: ${crew.name}`)
      .setColor(Colors.DarkGreen)
      .setThumbnail(discordGuild.iconURL())
      .setDescription(content)
      .setFooter({
        iconURL: member.avatarURL() ?? member.user.avatarURL(),
        text: `Submitted by ${member.displayName}`,
      })
      .setTimestamp(createdAt);

    return this.add({
      embeds: [embed],
    });
  }

  addCrewMention(crew: Crew) {
    return this.add({
      content: roleMention(crew.roleSf),
      allowedMentions: { roles: [crew.roleSf] },
    });
  }
}
