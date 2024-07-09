import { Injectable, Logger, UseInterceptors } from '@nestjs/common';
import {
  Button,
  ButtonContext,
  ComponentParam,
  Context,
  MessageCommand,
  MessageCommandContext,
  Modal,
  ModalContext,
  ModalParam,
  Options,
  SelectedStrings,
  SlashCommandContext,
  StringOption,
  StringSelect,
  StringSelectContext,
  Subcommand,
  TargetMessage,
} from 'necord';
import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  GuildChannelResolvable,
  Message,
  ModalBuilder,
  Snowflake,
  TextInputBuilder,
  TextInputStyle,
} from 'discord.js';
import { ConfigService } from 'src/config';
import { EchoCommand } from 'src/bot/echo.command-group';
import { CrewService } from 'src/bot/crew/crew.service';
import { CrewRepository } from 'src/bot/crew/crew.repository';
import { TicketTag } from 'src/bot/tag/tag.service';
import { SelectCrewCommandParams } from 'src/bot/crew/crew.command';
import { CrewSelectAutocompleteInterceptor } from 'src/bot/crew/crew-select.interceptor';
import { TicketService } from './ticket.service';
import { TicketRepository } from './ticket.repository';
import {
  proxyTicketMessage,
  ticketPromptCrewCreateInstructions,
  ticketPromptCrewJoinInstructions,
  ticketPromptDescription,
  ticketPromptStatusInstructions,
  ticketPromptTriageHelp,
} from './ticket.messages';

export const TicketActionToTag: Record<string, TicketTag> = {
  accept: TicketTag.ACCEPTED,
  decline: TicketTag.DECLINED,
  active: TicketTag.IN_PROGRESS,
  repeat: TicketTag.REPEATABLE,
  done: TicketTag.DONE,
  close: TicketTag.ABANDONED,
};

export class TicketDeclineReasonCommandParams {
  @StringOption({
    name: 'reason',
    description: 'Provide a reason',
    required: true,
  })
  reason: string;
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
    private readonly crewRepo: CrewRepository,
    private readonly ticketService: TicketService,
    private readonly ticketRepo: TicketRepository,
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
      .setColor('DarkGold')
      .setTitle('Create a Ticket')
      .setDescription(ticketPromptDescription())
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
          value: ticketPromptStatusInstructions(),
          inline: false,
        },
        {
          name: 'Create a Crew',
          value: ticketPromptCrewCreateInstructions(),
          inline: false,
        },
      );

    const maybeCrew = await this.crewRepo.findOne({ where: { channel: data.crew } });

    // Use selected crew
    if (data.crew) {
      const crew = await this.crewRepo.findOne({ where: { channel: data.crew } });

      if (!crew) {
        return interaction.reply({ content: 'Invalid crew', ephemeral: true });
      }

      const create = new ButtonBuilder()
        .setCustomId(`ticket/start/${data.crew}`)
        .setLabel('Create Ticket')
        .setStyle(ButtonStyle.Primary);

      const row = new ActionRowBuilder<ButtonBuilder>().addComponents(create);

      await interaction.channel.send({
        components: [this.ticketService.createTicketButton(data.crew)],
        embeds: [prompt],
      });
      // Try infer crew from interaction channel
    } else if (maybeCrew) {
      await interaction.channel.send({
        components: [this.ticketService.createTicketButton(maybeCrew.channel)],
        embeds: [prompt],
      });

      // Show global ticket status
    } else {
      prompt.setDescription(ticketPromptDescription(true));
      const crews = await this.crewRepo.find({ where: { guild: interaction.guildId } });

      await interaction.channel.send({
        components: [this.ticketService.createCrewMenu(crews)],
        embeds: [prompt],
      });
    }

    return interaction.reply({ content: 'Done', ephemeral: true });
  }

  @UseInterceptors(CrewSelectAutocompleteInterceptor)
  @Subcommand({
    name: 'new',
    description: 'Create a new ticket',
    dmPermission: false,
  })
  async onNewTicketCommand(
    @Context() [interaction]: SlashCommandContext,
    @Options() data: SelectCrewCommandParams,
  ) {
    return interaction.showModal(
      this.buildTicketModal(data.crew ? data.crew : interaction.channelId),
    );
  }

  @Button('ticket/start/:crew')
  async onCrewTicketStart(
    @Context() [interaction]: ButtonContext,
    @ComponentParam('crew') channelRef: Snowflake,
  ) {
    const modal = this.buildTicketModal(channelRef);
    return interaction.showModal(modal);
  }

  @StringSelect('ticket/start')
  async onTicketStart(
    @Context() [interaction]: StringSelectContext,
    @SelectedStrings() [selected]: string[],
  ) {
    const modal = this.buildTicketModal(selected);
    return interaction.showModal(modal);
  }

  @MessageCommand({
    name: 'Create Ticket',
    dmPermission: false,
  })
  async onTicketStartForMessage(
    @Context() [interaction]: MessageCommandContext,
    @TargetMessage() message: Message,
  ) {
    const guild = message.guild;
    const submitter = await guild.members.fetch(interaction.user);
    const author = await guild.members.fetch(message.author);
    const modal = this.buildTicketModal(message.channel.id, {
      what: proxyTicketMessage(
        message.content,
        submitter.id,
        author.id,
        message.channelId,
        message.id,
      ),
    });
    interaction.showModal(modal);
  }

  buildTicketModal(
    channelRef: GuildChannelResolvable,
    values: {
      title?: string;
      what?: string;
      where?: string;
      when?: string;
    } = {},
    emoji: {
      title?: string;
      what?: string;
      where?: string;
      when?: string;
    } = {},
  ) {
    const titleInput = new TextInputBuilder()
      .setCustomId('ticket/form/title')
      .setLabel((emoji.title ? `${emoji.title} ` : '') + 'Title')
      .setPlaceholder('Summary of your request')
      .setValue(values.title || '')
      .setStyle(TextInputStyle.Short);

    const whatInput = new TextInputBuilder()
      .setCustomId('ticket/form/what')
      .setLabel((emoji.what ? `${emoji.what} ` : '') + 'What do you need?')
      .setPlaceholder(
        'Please be as detailed as possible and use exact quantities to prevent delays.',
      )
      .setValue(values.what || '')
      .setStyle(TextInputStyle.Paragraph);

    const whereInput = new TextInputBuilder()
      .setCustomId('ticket/form/where')
      .setLabel((emoji.where ? `${emoji.where} ` : '') + 'Where do you need it?')
      .setValue(values.where || 'We will fetch it when it is done')
      .setStyle(TextInputStyle.Paragraph);

    const whenInput = new TextInputBuilder()
      .setCustomId('ticket/form/when')
      .setLabel((emoji.when ? `${emoji.when} ` : '') + 'When do you need it?')
      .setValue(values.when || 'ASAP')
      .setStyle(TextInputStyle.Short);

    return new ModalBuilder()
      .setCustomId(`ticket/create/${channelRef}`)
      .setTitle('Create a Ticket')
      .addComponents(
        [titleInput, whatInput, whereInput, whenInput].map((input) =>
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
    const result = await this.ticketService.moveTicket(threadRef, selected, member.id);
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

    const result = await this.ticketService.createTicket(crewRef, member.id, {
      name: title,
      content,
      createdBy: member.id,
    });

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

    const thread = await guild.channels.fetch(threadRef);

    if (!thread.isThread()) {
      return interaction.reply({
        content: 'Invalid ticket. Please report this incident',
        ephemeral: true,
      });
    }

    const result = await this.ticketService.updateTicket(
      thread.id,
      member,
      TicketTag.DECLINED,
      reason,
    );
    await interaction.reply({ content: result.message, ephemeral: true });
  }

  @Subcommand({
    name: 'move',
    description: 'Show the select prompt send this ticket to another crew',
    dmPermission: false,
  })
  async onTicketMovePrompt(@Context() [interaction]: SlashCommandContext) {
    const ticket = await this.ticketRepo.findOne({
      where: { thread: interaction.channelId },
      withDeleted: true,
    });
    if (!ticket) {
      return interaction.reply({
        content: 'This command can only be used in a ticket',
        ephemeral: true,
      });
    }

    const row = await this.ticketService.createMovePrompt(ticket, [ticket.discussion]);

    return interaction.reply({ content: 'Select destination', components: [row], ephemeral: true });
  }

  @Subcommand({
    name: 'triage',
    description: 'Show the triage prompt change the state of the ticket',
    dmPermission: false,
  })
  async onTicketTriagePrompt(@Context() [interaction]: SlashCommandContext) {
    const { channel } = interaction;

    const ticket = await this.ticketRepo.findOne({
      where: { thread: channel.id },
      withDeleted: true,
    });

    if (!ticket) {
      return interaction.reply({
        content: 'This command can only be used in a ticket',
        ephemeral: true,
      });
    }

    const row = await this.ticketService.createTriageControl(ticket);

    return interaction.reply({ content: 'Select action', components: [row], ephemeral: true });
  }

  @Button('ticket/action/:action/:thread')
  async onTicketAction(
    @Context() [interaction]: ButtonContext,
    @ComponentParam('action') action: string,
    @ComponentParam('thread') threadId: Snowflake,
  ) {
    const { guild } = interaction;
    const tag = TicketActionToTag[action];
    const member = await guild.members.fetch(interaction.user.id);
    const thread = await guild.channels.fetch(threadId);

    if (!thread.isThread()) {
      return interaction.reply({
        content: 'Invalid ticket. Please report this incident',
        ephemeral: true,
      });
    }

    if (!tag) {
      return interaction.reply({
        content: 'Invalid ticket action. Please report this incident.',
        ephemeral: true,
      });
    }

    const result = await this.ticketService.updateTicket(thread.id, member, tag);
    await interaction.reply({ content: result.message, ephemeral: true });
  }

  async lifecycleCommand([interaction]: SlashCommandContext, tag: TicketTag, reason?: string) {
    const member = await interaction.guild.members.fetch(interaction.user);
    const thread = interaction.channel;

    if (!thread.isThread()) {
      return interaction.reply({
        content: 'This command must be used inside a ticket thread.',
      });
    }

    const result = await this.ticketService.updateTicket(thread.id, member, tag, reason);

    await interaction.reply({ content: result.message, ephemeral: true });
  }

  @Subcommand({
    name: 'accept',
    description: 'Accept a ticket. Team members only',
    dmPermission: false,
  })
  async onTicketAcceptCommand(@Context() context: SlashCommandContext) {
    return this.lifecycleCommand(context, TicketTag.ACCEPTED);
  }

  @Subcommand({
    name: 'decline',
    description: 'Decline a ticket. Team members only',
    dmPermission: false,
  })
  async onTicketDeclineCommand(
    @Context() context: SlashCommandContext,
    @Options() data: TicketDeclineReasonCommandParams,
  ) {
    return this.lifecycleCommand(context, TicketTag.DECLINED, data.reason);
  }

  @Subcommand({
    name: 'abandoned',
    description: 'Mark a ticket as abandoned. Team members only',
    dmPermission: false,
  })
  async onTicketAbandonedCommand(@Context() context: SlashCommandContext) {
    return this.lifecycleCommand(context, TicketTag.ABANDONED);
  }

  @Subcommand({
    name: 'start',
    description: 'Mark a ticket as being in progress. Team members only',
    dmPermission: false,
  })
  async onTicketStartCommand(@Context() context: SlashCommandContext) {
    return this.lifecycleCommand(context, TicketTag.IN_PROGRESS);
  }

  @Subcommand({
    name: 'repeatable',
    description: 'Mark a ticket as repeatable. Team members only',
    dmPermission: false,
  })
  async onTicketRepeatCommand(@Context() context: SlashCommandContext) {
    return this.lifecycleCommand(context, TicketTag.REPEATABLE);
  }

  @Subcommand({
    name: 'done',
    description: 'Complete a ticket. Team members only',
    dmPermission: false,
  })
  async onTicketDoneCommand(@Context() context: SlashCommandContext) {
    return this.lifecycleCommand(context, TicketTag.DONE);
  }

  @UseInterceptors(CrewSelectAutocompleteInterceptor)
  @Subcommand({
    name: 'status',
    description: 'Display the current ticket status for crews',
    dmPermission: false,
  })
  async onCrewStatusRequest(
    @Context() [interaction]: SlashCommandContext,
    @Options() data: SelectCrewCommandParams,
  ) {
    const member = await interaction.guild.members.fetch(interaction.user);
    let result;

    // Use specified crew
    if (data.crew) {
      const crew = await this.crewRepo.findOne({ where: { channel: data.crew } });
      result = await this.ticketService.sendIndividualStatus(interaction.channel, member, crew);

      // Try infer crew from current channel
    } else {
      const maybeCrew = await this.crewRepo.findOne({ where: { channel: interaction.channelId } });
      if (maybeCrew) {
        result = await this.ticketService.sendIndividualStatus(
          interaction.channel,
          member,
          maybeCrew,
        );

        // Send status for all crews
      } else {
        result = await this.ticketService.sendAllStatus(interaction.channel, member);
      }
    }
    return interaction.reply({ content: result.message, ephemeral: true });
  }
}
