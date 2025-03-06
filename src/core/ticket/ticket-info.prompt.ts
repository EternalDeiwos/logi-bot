import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  roleMention,
  Snowflake,
  StringSelectMenuBuilder,
  userMention,
  Guild as DiscordGuild,
  Colors,
} from 'discord.js';
import { BasePromptBuilder } from 'src/bot/prompt';
import { PromptEmbed } from 'src/bot/embed';
import { Crew, SelectCrewChannelDto } from 'src/core/crew/crew.entity';
import { Guild } from 'src/core/guild/guild.entity';
import { InsertTicketDto, SelectTicketDto } from './ticket.entity';

export const ticketTriageMessage = (member: Snowflake, role: Snowflake) => `
Welcome to our ticket system ${userMention(member)}. The members of our ${roleMention(role)} crew will be along as soon as possible to review your request. In the meanwhile, please make sure that you review the following instructions:

- You may be required to provide resources for us to complete this ticket. When the ticket is complete, please post proof, such as a screenshot, or ask the member who completed the request to post information so the ticket can be closed.
- Crew members can accept or decline the ticket using the controls provided.
- Once accepted, crew members can update the ticket using the buttons which will inform you of any progress, for example: when your request has been started if you are waiting in a queue.
- Only once a request is **completed, delivered, and proof is posted to this channel** should the ticket be marked as _Done_.
- At any point if you no longer need this ticket then you can close the ticket yourself by clicking the _Close_ button below.
- If the ticket is left unattended then it will be closed to keep our work area clean.
`;

const newTicketMessage = (body: string, member: Snowflake, role: Snowflake) => `
${roleMention(role)} here is a new ticket from ${userMention(member)}. Please see details below.

${body}
`;

type TriageControlDisabled = { [K in 'accept' | 'decline' | 'close']?: boolean };
type TriageControlOptions = { disabled: TriageControlDisabled };
type LifecycleControlDisabled = ('active' | 'repeat' | 'done' | 'close')[];
type LifecycleControlOptions = { disabled: LifecycleControlDisabled };

export class TicketInfoPromptBuilder extends BasePromptBuilder {
  public addGenericMessage(message: string) {
    return this.add({ embeds: [new PromptEmbed('PROMPT_GENERIC').setTitle(message)] });
  }

  public addTicketMessage(ticket: InsertTicketDto, crew: Crew) {
    const content = newTicketMessage(ticket.content, ticket.createdBy, crew.roleSf);
    const embed = new EmbedBuilder()
      .setColor(Colors.DarkGold)
      .setDescription(crew.ticketHelpText || ticketTriageMessage(ticket.createdBy, crew.roleSf));

    if (!crew.ticketHelpText) {
      embed.setTitle('New Ticket');
    }

    const allowedMentions = {
      users: [ticket.createdBy],
      roles: crew.hasMovePrompt ? [] : [crew.roleSf],
    };

    return this.add({
      content,
      embeds: [embed],
      allowedMentions,
    });
  }

  public addCrossGuildEmbed(originalGuild: Guild | DiscordGuild) {
    const embed = new EmbedBuilder()
      .setColor(Colors.DarkGreen)
      .setTitle(`Incoming Request from ${originalGuild.name}`)
      .setDescription(
        `This ticket was moved from ${originalGuild.name}. The ticket author might not have joined the server yet so please be patient.`,
      );

    if (originalGuild.icon) {
      embed.setThumbnail(originalGuild.icon);
    }

    return this.add({ embeds: [embed] });
  }

  public addMoveSelector(ticketRef: SelectTicketDto, guildSf: Snowflake, targetCrews: Crew[]) {
    const select = new StringSelectMenuBuilder()
      .setCustomId(`ticket/move/${ticketRef.threadSf}`)
      .setPlaceholder('Select a crew')
      .setOptions(
        targetCrews.map((crew) => {
          const teamName =
            crew.guild.guildSf !== guildSf
              ? `[${crew.guild.shortName}] ${crew.team.name}`
              : crew.team.name;
          return { label: `${teamName}: ${crew.name}`, value: crew.crewSf };
        }),
      );

    if (!select.options.length) {
      select
        .addOptions({ label: 'placeholder', value: 'placeholder' })
        .setPlaceholder('No crews available')
        .setDisabled(true);
    }

    return this.add({
      components: [new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(select)],
    });
  }

  public addTriageControls(ticketRef: SelectTicketDto, options?: TriageControlOptions) {
    const accept = new ButtonBuilder()
      .setCustomId(`ticket/action/accept/${ticketRef.threadSf}`)
      .setLabel('Accept')
      .setDisabled(Boolean(options?.disabled?.accept))
      .setStyle(ButtonStyle.Success);

    const decline = new ButtonBuilder()
      // Decline is not an immediate action.
      // There is a form before the action is taken and is therefore handled differently
      .setCustomId(`ticket/reqdecline/${ticketRef.threadSf}`)
      .setLabel('Decline')
      .setDisabled(Boolean(options?.disabled?.decline))
      .setStyle(ButtonStyle.Danger);

    const close = new ButtonBuilder()
      .setCustomId(`ticket/action/close/${ticketRef.threadSf}`)
      .setLabel('Close')
      .setDisabled(Boolean(options?.disabled?.close))
      .setStyle(ButtonStyle.Secondary);

    return this.add({
      components: [new ActionRowBuilder<ButtonBuilder>().addComponents(decline, accept, close)],
    });
  }

  public addLifecycleControls(ticketRef: SelectTicketDto, options?: LifecycleControlOptions) {
    const inProgress = new ButtonBuilder()
      .setCustomId(`ticket/action/active/${ticketRef.threadSf}`)
      .setLabel('In Progress')
      .setDisabled(Boolean(options?.disabled?.includes('active')))
      .setStyle(ButtonStyle.Primary);

    const repeatable = new ButtonBuilder()
      .setCustomId(`ticket/action/repeat/${ticketRef.threadSf}`)
      .setLabel('Repeatable')
      .setDisabled(Boolean(options?.disabled?.includes('repeat')))
      .setStyle(ButtonStyle.Secondary);

    const done = new ButtonBuilder()
      .setCustomId(`ticket/action/done/${ticketRef.threadSf}`)
      .setLabel('Done')
      .setDisabled(Boolean(options?.disabled?.includes('done')))
      .setStyle(ButtonStyle.Success);

    const close = new ButtonBuilder()
      .setCustomId(`ticket/action/close/${ticketRef.threadSf}`)
      .setLabel('Close')
      .setDisabled(Boolean(options?.disabled?.includes('close')))
      .setStyle(ButtonStyle.Danger);

    return this.add({
      components: [
        new ActionRowBuilder<ButtonBuilder>().addComponents(inProgress, repeatable, done, close),
      ],
    });
  }

  addCrewJoinButton(crew: SelectCrewChannelDto) {
    const join = new ButtonBuilder()
      .setCustomId(`crew/join/${crew.crewSf}`)
      .setLabel('Join Crew')
      .setStyle(ButtonStyle.Primary);

    return this.add({ components: [new ActionRowBuilder<ButtonBuilder>().addComponents(join)] });
  }
}
