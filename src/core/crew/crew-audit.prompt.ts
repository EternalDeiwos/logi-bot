import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  Colors,
  EmbedBuilder,
  userMention,
} from 'discord.js';
import { BasePromptBuilder } from 'src/bot/prompt';
import { Crew, SelectCrew } from './crew.entity';

export const crewAuditPrompt = (crew: Crew) =>
  `A new crew called **${crew.name}** was created by ${userMention(crew.createdBy)}. This prompt can be used to remove the team if there is something wrong.`;

export class CrewAuditPromptBuilder extends BasePromptBuilder {
  public addAuditMessage(crew: Crew) {
    const embed = new EmbedBuilder()
      .setTitle(
        `New Crew: ${crew.name}` + (crew.name !== crew.shortName ? ` (${crew.shortName})` : ''),
      )
      .setDescription(crewAuditPrompt(crew))
      .setTimestamp()
      .setColor(Colors.DarkGold);

    return this.add({ embeds: [embed] });
  }

  public addCrewDeleteButton(crewRef: SelectCrew) {
    const deleteButton = new ButtonBuilder()
      .setCustomId(`crew/reqdelete/${crewRef.crewSf}`)
      .setLabel('Delete')
      .setStyle(ButtonStyle.Danger);

    return this.add({
      components: [new ActionRowBuilder<ButtonBuilder>().addComponents(deleteButton)],
    });
  }
}
