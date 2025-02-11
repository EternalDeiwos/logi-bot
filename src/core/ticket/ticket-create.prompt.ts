import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  StringSelectMenuBuilder,
} from 'discord.js';
import { BasePromptBuilder } from 'src/bot/prompt';
import { Crew, SelectCrewChannelDto } from 'src/core/crew/crew.entity';

export const ticketPromptDescription = (multi = false) =>
  `${multi ? 'Select a crew that will receive your ticket' : 'Create a ticket by clicking the button below'}. Please be patient for a member to discuss the ticket with you. If you are unsure of how to fill in a ticket then ask for help in any channel.`;

export const ticketPromptTriageHelp = () =>
  `Your ticket will first be sent to Triage where it will be evaluated and assigned to a relevant crew. Once the ticket is assigned, then a member of the crew will evaluate the request and accept or decline it. If we cannot meet your request exactly (e.g. if there is a queue) then we will let you know about adjustments in the ticket.`;

export const ticketPromptCrewJoinInstructions = () =>
  `Crews are groups of players dedicated to one particular task or facility. Each crew has their own channel and anyone can join a crew using the _Join_ button pinned in the relevant channel or using the \`/echo crew join\` slash command. Any crew member may accept or decline tickets for the crew.`;

export const crewPromptStatusInstructions = () =>
  `You can view a crew's status and current members by running the \`/echo crew status\` slash command inside the crew channel. You can view the current status for all crews by running the same command in any non-crew channel.`;

export const ticketPromptStatusInstructions = () =>
  `You can view a summary of open tickets for a crew by running the \`/echo ticket status\` slash command  inside the crew channel. You can also see a summary of all tickets by running the same command in any non-crew channel.`;

export const ticketPromptCrewCreateInstructions = () => `
Any verified members may create a crew using the slash command \`/echo crew create\` and providing the necessary options:
- \`name\` is the display name of the crew as it will appear in selection lists and the crew mentionable role. The channel name will also be derived from this.
- \`name_short\` a unique short name for the crew that will be used in forum tags and other space-constrained interfaces. Must be less than 20 characters long.

Once your crew channel has been created, check the prompt for further instructions.
`;

export class TicketCreatePromptBuilder extends BasePromptBuilder {
  addCreateTicketMessage(selector: boolean = false) {
    const embed = new EmbedBuilder()
      .setColor('DarkGold')
      .setTitle('Create a Ticket')
      .setDescription(ticketPromptDescription(selector))
      .addFields(
        {
          name: 'Triage Process',
          value: ticketPromptTriageHelp(),
          inline: false,
        },
        {
          name: 'Crews',
          value: ticketPromptCrewJoinInstructions(),
          inline: false,
        },
        {
          name: 'Crew Status',
          value: crewPromptStatusInstructions(),
          inline: false,
        },
        {
          name: 'Ticket Status',
          value: ticketPromptStatusInstructions(),
          inline: false,
        },
        {
          name: 'Create a Crew',
          value: ticketPromptCrewCreateInstructions(),
          inline: false,
        },
      );

    return this.add({ embeds: [embed] });
  }

  addCreateButton(crewRef: SelectCrewChannelDto) {
    const create = new ButtonBuilder()
      .setCustomId(`ticket/start/${crewRef.crewSf}`)
      .setLabel('Create Ticket')
      .setStyle(ButtonStyle.Primary);

    return this.add({ components: [new ActionRowBuilder<ButtonBuilder>().addComponents(create)] });
  }

  addCrewSelector(targetCrews: Crew[]) {
    const select = new StringSelectMenuBuilder().setCustomId('ticket/start');

    if (targetCrews.length) {
      select.setPlaceholder('Select a crew').setOptions(
        targetCrews.map((crew) => ({
          label: `${crew.team.name}: ${crew.name}`,
          value: crew.crewSf,
        })),
      );
    } else {
      select
        .addOptions({ label: 'placeholder', value: 'placeholder' })
        .setPlaceholder('No crews available')
        .setDisabled(true);
    }

    return this.add({
      components: [new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(select)],
    });
  }
}
