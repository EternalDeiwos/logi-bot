import { Injectable, Logger, UseInterceptors } from '@nestjs/common';
import {
  Button,
  ButtonContext,
  ComponentParam,
  Context,
  Modal,
  ModalContext,
  ModalParam,
  Options,
  SelectedStrings,
  SlashCommandContext,
  StringSelect,
  StringSelectContext,
  Subcommand,
} from 'necord';
import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  GuildChannelResolvable,
  ModalBuilder,
  Snowflake,
  StringSelectMenuBuilder,
  TextInputBuilder,
  TextInputStyle,
} from 'discord.js';
import { ConfigService } from 'src/config';
import { EchoCommand } from 'src/bot/echo.command-group';
import { CrewService } from 'src/bot/crew/crew.service';
import { SelectCrewCommandParams } from 'src/bot/crew/crew.command';
import { CrewSelectAutocompleteInterceptor } from 'src/bot/crew/crew-select.interceptor';
import { TicketService } from './ticket.service';
import { ticketPromptDescription } from './ticket.messages';

@Injectable()
@EchoCommand({
  name: 'ticket',
  description: 'Manage tickets',
})
export class TicketCommand {
  private readonly logger = new Logger(TicketCommand.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly crewService: CrewService,
    private readonly ticketService: TicketService,
  ) {}

  @UseInterceptors(CrewSelectAutocompleteInterceptor)
  @Subcommand({
    name: 'prompt',
    description: 'Create a form to start the ticket wizard',
    dmPermission: false,
  })
  async onPrompt(
    @Context() [interaction]: SlashCommandContext,
    @Options() data: SelectCrewCommandParams,
  ) {
    const prompt = new EmbedBuilder()
      .setColor(0x333333)
      .setTitle('Create a Ticket')
      .setDescription(ticketPromptDescription());

    if (data.crew) {
      const crew = await this.crewService.getCrew(data.crew);

      if (!crew) {
        return interaction.reply({ content: 'Invalid crew', ephemeral: true });
      }

      const create = new ButtonBuilder()
        .setCustomId(`ticket/start/${data.crew}`)
        .setLabel('Create Ticket')
        .setStyle(ButtonStyle.Primary);

      const row = new ActionRowBuilder<ButtonBuilder>().addComponents(create);

      await interaction.channel.send({
        components: [row],
        embeds: [prompt],
      });
    } else {
      const crews = await this.crewService.getCrews(interaction.guild);

      const select = new StringSelectMenuBuilder()
        .setCustomId('ticket/start')
        .setPlaceholder('Select a crew')
        .setOptions(
          crews.map((crew) => ({ label: `${crew.team.name}: ${crew.name}`, value: crew.channel })),
        );

      const row = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(select);

      await interaction.channel.send({
        components: [row],
        embeds: [prompt],
      });
    }

    return interaction.reply({ content: 'Done', ephemeral: true });
  }

  @Button('ticket/start/:crew')
  async onCrewTicketStart(
    @Context() [interaction]: ButtonContext,
    @ComponentParam('crew') channelRef: Snowflake,
  ) {
    const modal = this.buildTicketModal(channelRef);
    interaction.showModal(modal);
  }

  @StringSelect('ticket/start')
  async onTicketStart(
    @Context() [interaction]: StringSelectContext,
    @SelectedStrings() [selected]: string[],
  ) {
    const modal = this.buildTicketModal(selected);
    interaction.showModal(modal);
  }

  buildTicketModal(channelRef: GuildChannelResolvable) {
    const titleInput = new TextInputBuilder()
      .setCustomId('ticket/form/title')
      .setLabel('Title')
      .setStyle(TextInputStyle.Short);

    const whoInput = new TextInputBuilder()
      .setCustomId('ticket/form/who')
      .setLabel('Who is it for?')
      .setStyle(TextInputStyle.Short);

    const whatInput = new TextInputBuilder()
      .setCustomId('ticket/form/what')
      .setLabel('What do you need?')
      .setStyle(TextInputStyle.Paragraph);

    const whereInput = new TextInputBuilder()
      .setCustomId('ticket/form/where')
      .setLabel('Where do you need it?')
      .setStyle(TextInputStyle.Paragraph);

    const whenInput = new TextInputBuilder()
      .setCustomId('ticket/form/when')
      .setLabel('When do you need it?')
      .setStyle(TextInputStyle.Short);

    return new ModalBuilder()
      .setCustomId(`ticket/create/${channelRef}`)
      .setTitle('Create a Ticket')
      .addComponents(
        [titleInput, whoInput, whatInput, whereInput, whenInput].map((input) =>
          new ActionRowBuilder<TextInputBuilder>().addComponents(input),
        ),
      );
  }

  @StringSelect('ticket/move/:thread')
  async onTicketMove(
    @Context() [interaction]: StringSelectContext,
    @ComponentParam('thread') threadRef: Snowflake,
    @SelectedStrings() [selected]: string[],
  ) {
    const member = await interaction.guild.members.fetch(interaction.user);
    const result = await this.ticketService.moveTicket(threadRef, selected, member);
    return interaction.reply({ content: result.message, ephemeral: true });
  }

  @Modal('ticket/create/:crew')
  async onTicketSubmit(
    @Context() [interaction]: ModalContext,
    @ModalParam('crew') crewRef: Snowflake,
  ) {
    const guild = interaction.guild;
    const member = await guild.members.fetch(interaction.user);

    const title = interaction.fields.getTextInputValue('ticket/form/title');
    const content = [
      '## Who are you affiliated with?',
      interaction.fields.getTextInputValue('ticket/form/who'),
      '',
      '## What do you need?',
      interaction.fields.getTextInputValue('ticket/form/what'),
      '',
      '## Where is it needed?',
      interaction.fields.getTextInputValue('ticket/form/where'),
      '',
      '## When do you need it by?',
      interaction.fields.getTextInputValue('ticket/form/when'),
      '',
      '',
    ].join('\n');

    const result = await this.ticketService.createTicket(crewRef, member, title, content);

    return interaction.reply({ content: result.message, ephemeral: true });
  }

  @Button('ticket/accept/:thread')
  async onTicketAccept(
    @Context() [interaction]: ButtonContext,
    @ComponentParam('thread') threadRef: Snowflake,
  ) {
    const guild = interaction.guild;
    const member = await guild.members.fetch(interaction.user);
    const result = await this.ticketService.acceptTicket(threadRef, member);
    return interaction.reply({ content: result.message, ephemeral: true });
  }

  buildDeclineModal(threadRef: GuildChannelResolvable) {
    const reason = new TextInputBuilder()
      .setCustomId('ticket/decline/reason')
      .setLabel('Reason')
      .setStyle(TextInputStyle.Paragraph);

    return new ModalBuilder()
      .setCustomId(`ticket/decline/${threadRef}`)
      .setTitle('Decline Ticket')
      .addComponents(new ActionRowBuilder<TextInputBuilder>().addComponents(reason));
  }

  @Button('ticket/reqdecline/:thread')
  async onTicketRequestDecline(
    @Context() [interaction]: ButtonContext,
    @ComponentParam('thread') threadRef: Snowflake,
  ) {
    const modal = this.buildDeclineModal(threadRef);
    interaction.showModal(modal);
  }

  @Modal('ticket/decline/:thread')
  async onTicketDecline(
    @Context() [interaction]: ModalContext,
    @ModalParam('thread') threadRef: Snowflake,
  ) {
    const guild = interaction.guild;
    const member = await guild.members.fetch(interaction.user);
    const reason = interaction.fields.getTextInputValue('ticket/decline/reason');
    const result = await this.ticketService.declineTicket(threadRef, reason, member);
    return interaction.reply({ content: result.message, ephemeral: true });
  }
}
