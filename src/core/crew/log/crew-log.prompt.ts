import {
  Colors,
  EmbedBuilder,
  Guild as DiscordGuild,
  GuildMember,
  roleMention,
  ButtonStyle,
  ButtonBuilder,
  ActionRowBuilder,
} from 'discord.js';
import { BasePromptBuilder } from 'src/bot/prompt';
import { Crew } from 'src/core/crew/crew.entity';

export class CrewLogPromptBuilder extends BasePromptBuilder {
  addCrewLogMessage(
    discordGuild: DiscordGuild,
    crew: Crew,
    member: GuildMember,
    content: string,
    createdAt: Date,
    warNumber: string,
  ) {
    const embed = new EmbedBuilder()
      .setTitle(`Crew Update: ${crew.name}`)
      .setColor(Colors.DarkGreen)
      .setThumbnail(discordGuild.iconURL())
      .setDescription(content)
      .setFooter({
        iconURL: member.avatarURL() ?? member.user.avatarURL(),
        text: `WC${warNumber} • Submitted by ${member.displayName}`,
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

  addCrewJoinButton(crew: Crew) {
    const join = new ButtonBuilder()
      .setCustomId(`crew/join/${crew.crewSf}`)
      .setLabel('Join Crew')
      .setStyle(ButtonStyle.Primary);

    return this.add({
      components: [new ActionRowBuilder<ButtonBuilder>().addComponents(join)],
    });
  }
}
