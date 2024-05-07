import { Injectable, Logger } from '@nestjs/common';
import {
  Context,
  Modal,
  ModalContext,
  ModalParam,
  SelectedStrings,
  SlashCommandContext,
  StringOption,
  StringSelect,
  Subcommand,
  UserSelectContext,
} from 'necord';
import {
  ActionRowBuilder,
  EmbedBuilder,
  ModalBuilder,
  Snowflake,
  StringSelectMenuBuilder,
  TextInputBuilder,
  TextInputStyle,
} from 'discord.js';
import { ConfigService } from 'src/config';
import { EchoCommand } from 'src/bot/echo.command-group';
import { CrewService } from 'src/bot/crew/crew.service';
import { TicketService } from './ticket.service';
import { ticketPromptDescription } from './ticket.messages';

export class CreateCrewCommandParams {
  @StringOption({
    name: 'name',
    description: 'Tag name',
    required: true,
  })
  name: string;
}

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

  @Subcommand({
    name: 'prompt',
    description: 'Create a form to start the ticket wizard',
    dmPermission: false,
  })
  async onPrompt(@Context() [interaction]: SlashCommandContext) {
    const crews = await this.crewService.getCrews(interaction.guild);
    this.logger.debug(JSON.stringify(crews));

    const select = new StringSelectMenuBuilder()
      .setCustomId('ticket/start')
      .setPlaceholder('Select a crew')
      .setOptions(
        crews.map((crew) => ({ label: `${crew.team.name}: ${crew.name}`, value: crew.channel })),
      );

    const row = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(select);

    const prompt = new EmbedBuilder()
      .setColor(0x333333)
      .setTitle('Create a Ticket')
      .setDescription(ticketPromptDescription());

    await interaction.channel.send({
      components: [row],
      embeds: [prompt],
    });
    await interaction.reply({ content: 'Done', ephemeral: true });
  }

  @StringSelect('ticket/start')
  async onTicketStart(
    @Context() [interaction]: UserSelectContext,
    @SelectedStrings() [selected]: string[],
  ) {
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

    const modal = new ModalBuilder()
      .setCustomId(`ticket/create/${selected}`)
      .setTitle('Create a Ticket')
      .addComponents(
        [titleInput, whoInput, whatInput, whereInput, whenInput].map((input) =>
          new ActionRowBuilder<TextInputBuilder>().addComponents(input),
        ),
      );

    interaction.showModal(modal);
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
}
