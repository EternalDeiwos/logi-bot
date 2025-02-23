import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  Colors,
  EmbedBuilder,
  GuildMember,
  userMention,
} from 'discord.js';
import { BasePromptBuilder } from 'src/bot/prompt';
import { Crew, SelectCrewDto } from './crew.entity';

export class CrewAuditPromptBuilder extends BasePromptBuilder {
  public addApprovalMessage(crew: Crew, warNumber: string, member: GuildMember) {
    const embed = new EmbedBuilder()
      .setTitle(
        `New Crew: ${crew.name}` + (crew.name !== crew.shortName ? ` (${crew.shortName})` : ''),
      )
      .setDescription(
        `${userMention(crew.createdBy)} would like to create a new crew called **${crew.name}** under ${crew.team.name}.`,
      )
      .setTimestamp()
      .setColor(Colors.DarkGold)
      .setFooter({
        iconURL: member.avatarURL() ?? member.user.avatarURL(),
        text: `WC${warNumber} • Submitted by ${member.displayName}`,
      });

    const approveButton = new ButtonBuilder()
      .setCustomId(`crew/reqapprove/${crew.id}`)
      .setLabel('Approve')
      .setStyle(ButtonStyle.Success);

    const denyButton = new ButtonBuilder()
      .setCustomId(`crew/reqdelete/${crew.id}`)
      .setLabel('Deny')
      .setStyle(ButtonStyle.Danger);

    return this.add({
      embeds: [embed],
      components: [new ActionRowBuilder<ButtonBuilder>().addComponents(approveButton, denyButton)],
    });
  }

  public addApprovedMessage(member: GuildMember) {
    const embed = new EmbedBuilder()
      .setTitle('Approved')
      .setThumbnail(member.avatarURL() ?? member.user.avatarURL())
      .setDescription(`Approved by ${member}. Crew role and channels will be created shortly.`)
      .setColor(Colors.DarkGreen);

    return this.add({ embeds: [embed] });
  }

  public addAuditMessage(crew: Crew, warNumber: string, member: GuildMember) {
    const embed = new EmbedBuilder()
      .setTitle(
        `New Crew: ${crew.name}` + (crew.name !== crew.shortName ? ` (${crew.shortName})` : ''),
      )
      .setDescription(
        `A new crew called **${crew.name}** was created by ${userMention(crew.createdBy)}. This prompt can be used to remove it if something is wrong.`,
      )
      .setTimestamp()
      .setColor(Colors.DarkGold)
      .setFooter({
        iconURL: member.avatarURL() ?? member.user.avatarURL(),
        text: `WC${warNumber} • Submitted by ${member.displayName}`,
      });

    return this.add({ embeds: [embed] });
  }

  public addCrewDeleteButton(crewRef: SelectCrewDto) {
    const deleteButton = new ButtonBuilder()
      .setCustomId(`crew/reqdelete/${crewRef.id}`)
      .setLabel('Delete')
      .setStyle(ButtonStyle.Danger);

    return this.add({
      components: [new ActionRowBuilder<ButtonBuilder>().addComponents(deleteButton)],
    });
  }
}
