import { Injectable, Logger, UseFilters, UseInterceptors } from '@nestjs/common';
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
import { Message, Snowflake } from 'discord.js';
import { AuthError, InternalError } from 'src/errors';
import { BotService, CommandInteraction } from 'src/bot/bot.service';
import { SuccessEmbed } from 'src/bot/embed';
import { EchoCommand } from 'src/core/echo.command-group';
import { DiscordExceptionFilter } from 'src/bot/bot-exception.filter';
import { GuildService } from 'src/core/guild/guild.service';
import { CrewService } from 'src/core/crew/crew.service';
import { AccessService } from 'src/core/access/access.service';
import { AccessDecision } from 'src/core/access/access-decision';
import { AccessRuleType } from 'src/core/access/access.entity';
import { AccessRuleMode } from 'src/core/access/access-rule';
import { TicketTag } from 'src/core/tag/tag.service';
import { SelectCrewCommandParams } from 'src/core/crew/crew.command';
import { CrewSelectAutocompleteInterceptor } from 'src/core/crew/crew-select.interceptor';
import { TicketService } from './ticket.service';
import { SelectTicket } from './ticket.entity';
import { TicketCreatePromptBuilder } from './ticket-create.prompt';
import { TicketInfoPromptBuilder } from './ticket-info.prompt';
import { TicketCreateModalBuilder } from './ticket-create.modal';
import { TicketDeclineModalBuilder } from './ticket-decline.modal';

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
@UseFilters(DiscordExceptionFilter)
export class TicketCommand {
  private readonly logger = new Logger(TicketCommand.name);

  constructor(
    private readonly botService: BotService,
    private readonly guildService: GuildService,
    private readonly crewService: CrewService,
    private readonly ticketService: TicketService,
    private readonly accessService: AccessService,
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
    try {
      BigInt(data.crew);
    } catch {
      return interaction.reply({ ephemeral: true, content: 'Invalid crew selected' });
    }

    const prompt = new TicketCreatePromptBuilder();

    if (data.crew) {
      // Use selected crew
      prompt.addCreateTicketMessage().addCreateButton({ crewSf: data.crew });
    } else {
      // Show crew selector
      const crews = await this.crewService
        .query()
        .byGuild({ guildSf: interaction.guildId })
        .getMany();

      prompt.addCreateTicketMessage(true).addCrewSelector(crews);
    }
    await interaction.channel.send(prompt.build());

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
    const modal = new TicketCreateModalBuilder().addForm({
      crewSf: data.crew || interaction.channelId,
    });
    return interaction.showModal(modal);
  }

  @Button('ticket/start/:crew')
  async onCrewTicketStart(
    @Context() [interaction]: ButtonContext,
    @ComponentParam('crew') channelRef: Snowflake,
  ) {
    const modal = new TicketCreateModalBuilder().addForm({
      crewSf: channelRef || interaction.channelId,
    });
    return interaction.showModal(modal);
  }

  @StringSelect('ticket/start')
  async onTicketStart(
    @Context() [interaction]: StringSelectContext,
    @SelectedStrings() [selected]: string[],
  ) {
    const modal = new TicketCreateModalBuilder().addForm({
      crewSf: selected,
    });
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
    const memberRef = interaction.member?.user?.id ?? interaction.user?.id;
    const authorRef = message.author?.id;
    let channelRef = message.channelId;

    try {
      await this.crewService.query().byCrew({ crewSf: channelRef }).getOneOrFail();
    } catch {
      const guild = await this.guildService
        .query()
        .byGuild({ guildSf: interaction.guildId })
        .getOneOrFail();
      channelRef = guild.config.ticketTriageCrew;
    }

    const modal = new TicketCreateModalBuilder().addForm(
      { crewSf: channelRef },
      {
        what: {
          value: TicketCreateModalBuilder.makeProxyTicketMessage(
            message.content,
            memberRef,
            authorRef,
            channelRef,
            message.id,
          ),
        },
      },
    );
    interaction.showModal(modal);
  }

  @StringSelect('ticket/move/:thread')
  async onTicketMove(
    @Context() [interaction]: StringSelectContext,
    @ComponentParam('thread') threadRef: Snowflake,
    @SelectedStrings() [selected]: string[],
  ) {
    const memberRef = interaction.member?.user?.id ?? interaction.user?.id;
    const ticket = await this.ticketService
      .query()
      .withCrew()
      .byTicket({ threadSf: threadRef })
      .getOneOrFail();

    const accessArgs = await this.accessService.getTestArgs(interaction);

    if (
      new AccessDecision(AccessRuleType.PERMIT, {
        mode: AccessRuleMode.ANY,
        spec: [{ crew: { id: ticket.crew.id } }, { guildAdmin: true }],
      }).deny(...accessArgs)
    ) {
      throw new AuthError('FORBIDDEN', 'Only crew members can perform this action').asDisplayable();
    }

    await this.botService.replyOrFollowUp(interaction, {
      embeds: [new SuccessEmbed('SUCCESS_GENERIC').setTitle('Moving ticket')],
    });

    const targetCrew = await this.crewService.query().byCrew({ crewSf: selected }).getOneOrFail();
    const result = await this.ticketService.moveTicket(
      { threadSf: threadRef },
      { guildId: ticket.crew.guildId, crewId: targetCrew.id, updatedBy: memberRef },
    );
  }

  @Modal('ticket/create/:crew')
  async onTicketSubmit(
    @Context() [interaction]: ModalContext,
    @ModalParam('crew') crewRef: Snowflake,
  ) {
    const memberRef = interaction.member?.user?.id ?? interaction.user?.id;

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

    const crew = await this.crewService.query().byCrew({ crewSf: crewRef }).getOneOrFail();
    const result = await this.ticketService.createTicket(crew, {
      name: title,
      content,
      crewId: crew.id,
      createdBy: memberRef,
      updatedBy: memberRef,
    });

    await this.botService.replyOrFollowUp(interaction, {
      embeds: [new SuccessEmbed('SUCCESS_GENERIC').setTitle('Ticket created')],
    });
  }

  @Button('ticket/reqdecline/:thread')
  async onTicketRequestDecline(
    @Context() [interaction]: ButtonContext,
    @ComponentParam('thread') threadRef: Snowflake,
  ) {
    const modal = new TicketDeclineModalBuilder().addForm({ threadSf: threadRef });
    interaction.showModal(modal);
  }

  @Modal('ticket/decline/:thread')
  async onTicketDecline(
    @Context() [interaction]: ModalContext,
    @ModalParam('thread') threadRef: Snowflake,
  ) {
    const memberRef = interaction.member?.user?.id ?? interaction.user?.id;
    const ticket = await this.ticketService
      .query()
      .withCrew()
      .byTicket({ threadSf: threadRef })
      .getOneOrFail();

    const accessArgs = await this.accessService.getTestArgs(interaction);

    if (
      new AccessDecision(AccessRuleType.PERMIT, {
        mode: AccessRuleMode.ANY,
        spec: [{ crew: { id: ticket.crew.id } }, { guildAdmin: true }],
      }).deny(...accessArgs)
    ) {
      throw new AuthError('FORBIDDEN', 'Only crew members can perform this action').asDisplayable();
    }

    const reason = interaction.fields.getTextInputValue('ticket/decline/reason');

    const result = await this.ticketService.updateTicket(
      { threadSf: threadRef, updatedBy: memberRef },
      TicketTag.DECLINED,
      reason,
    );

    await this.botService.replyOrFollowUp(interaction, {
      embeds: [new SuccessEmbed('SUCCESS_GENERIC').setTitle('Ticket declined')],
    });
  }

  @Subcommand({
    name: 'move',
    description: 'Show the move prompt to send this ticket to another crew',
    dmPermission: false,
  })
  async onTicketMovePrompt(@Context() [interaction]: SlashCommandContext) {
    const ticketRef: SelectTicket = { threadSf: interaction.channelId };
    const ticket = await this.ticketService.query().withCrew().byTicket(ticketRef).getOneOrFail();

    const accessArgs = await this.accessService.getTestArgs(interaction);

    if (
      new AccessDecision(AccessRuleType.PERMIT, {
        mode: AccessRuleMode.ANY,
        spec: [{ crew: { id: ticket.crew.id } }, { guildAdmin: true }],
      }).deny(...accessArgs)
    ) {
      throw new AuthError('FORBIDDEN', 'Only crew members can perform this action').asDisplayable();
    }

    const crews = await this.crewService
      .query()
      .byGuildAndShared({ guildSf: ticket.guild.guildSf })
      .withTeam()
      .getMany();
    const prompt = new TicketInfoPromptBuilder()
      .addGenericMessage('Select destination')
      .addMoveSelector(
        ticket,
        ticket.guild.guildSf,
        crews.filter((crew) => ![ticket.crew.crewSf].includes(crew.crewSf)),
      );

    await this.botService.replyOrFollowUp(interaction, prompt.build());
  }

  @Subcommand({
    name: 'triage',
    description: 'Show the triage prompt change the state of the ticket',
    dmPermission: false,
  })
  async onTicketTriagePrompt(@Context() [interaction]: SlashCommandContext) {
    const memberRef = interaction.member?.user?.id ?? interaction.user?.id;
    const ticket = await this.ticketService
      .query()
      .byTicket({ threadSf: interaction.channelId })
      .getOneOrFail();

    const accessArgs = await this.accessService.getTestArgs(interaction);

    if (
      new AccessDecision(AccessRuleType.PERMIT, {
        mode: AccessRuleMode.ANY,
        spec: [{ crew: { id: ticket.crew.id } }, { guildAdmin: true }],
      }).deny(...accessArgs)
    ) {
      throw new AuthError('FORBIDDEN', 'Only crew members can perform this action').asDisplayable();
    }

    const prompt = new TicketInfoPromptBuilder()
      .addGenericMessage('Select action')
      .addTriageControls(ticket);
    await this.botService.replyOrFollowUp(interaction, prompt.build());
  }

  @Button('ticket/action/:action/:thread')
  async onTicketAction(
    @Context() [interaction]: ButtonContext,
    @ComponentParam('action') action: string,
    @ComponentParam('thread') threadRef: Snowflake,
  ) {
    const tag = TicketActionToTag[action];

    if (!tag) {
      throw new InternalError('INTERNAL_SERVER_ERROR', 'Invalid action').asDisplayable();
    }

    return this.lifecycleCommand([interaction], tag);
  }

  async lifecycleCommand([interaction]: [CommandInteraction], tag: TicketTag, reason?: string) {
    const memberRef = interaction.member?.user?.id ?? interaction.user?.id;
    const ticket = await this.ticketService
      .query()
      .withCrew()
      .byTicket({ threadSf: interaction.channelId })
      .getOneOrFail();

    const accessArgs = await this.accessService.getTestArgs(interaction);

    if (
      new AccessDecision(AccessRuleType.PERMIT, {
        mode: AccessRuleMode.ANY,
        spec: [{ crew: { id: ticket.crew.id } }, { guildAdmin: true }],
      }).deny(...accessArgs)
    ) {
      throw new AuthError('FORBIDDEN', 'Only crew members can perform this action').asDisplayable();
    }

    const result = await this.ticketService.updateTicket(
      { threadSf: ticket.threadSf, updatedBy: memberRef },
      tag,
      reason,
    );

    await this.botService.replyOrFollowUp(interaction, {
      embeds: [new SuccessEmbed('SUCCESS_GENERIC').setTitle('Ticket updated')],
    });
  }

  @Subcommand({
    name: 'accept',
    description: 'Accept a ticket. Crew members only',
    dmPermission: false,
  })
  async onTicketAcceptCommand(@Context() context: SlashCommandContext) {
    return this.lifecycleCommand(context, TicketTag.ACCEPTED);
  }

  @Subcommand({
    name: 'decline',
    description: 'Decline a ticket. Crew members only',
    dmPermission: false,
  })
  async onTicketDeclineCommand(
    @Context() context: SlashCommandContext,
    @Options() data: TicketDeclineReasonCommandParams,
  ) {
    return this.lifecycleCommand(context, TicketTag.DECLINED, data.reason);
  }

  @Subcommand({
    name: 'close',
    description: 'Mark a ticket as abandoned. Crew members only',
    dmPermission: false,
  })
  async onTicketCloseCommand(@Context() context: SlashCommandContext) {
    return this.lifecycleCommand(context, TicketTag.ABANDONED);
  }

  @Subcommand({
    name: 'abandoned',
    description: 'Mark a ticket as abandoned. Crew members only',
    dmPermission: false,
  })
  async onTicketAbandonedCommand(@Context() context: SlashCommandContext) {
    return this.lifecycleCommand(context, TicketTag.ABANDONED);
  }

  @Subcommand({
    name: 'start',
    description: 'Mark a ticket as being in progress. Crew members only',
    dmPermission: false,
  })
  async onTicketStartCommand(@Context() context: SlashCommandContext) {
    return this.lifecycleCommand(context, TicketTag.IN_PROGRESS);
  }

  @Subcommand({
    name: 'repeatable',
    description: 'Mark a ticket as repeatable. Crew members only',
    dmPermission: false,
  })
  async onTicketRepeatCommand(@Context() context: SlashCommandContext) {
    return this.lifecycleCommand(context, TicketTag.REPEATABLE);
  }

  @Subcommand({
    name: 'done',
    description: 'Complete a ticket. Crew members only',
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
    const memberRef = interaction.member?.user?.id ?? interaction.user?.id;
    const crewRef = data.crew || interaction.channelId;
    const crew = await this.crewService.query().byCrew({ crewSf: crewRef }).getOne();

    if (crew) {
      await this.ticketService.sendIndividualStatus(
        { crewSf: crewRef },
        interaction.channelId,
        memberRef,
      );
    } else {
      await this.ticketService.sendAllStatus(
        { guildSf: interaction.guildId },
        interaction.channelId,
        memberRef,
      );
    }

    await this.botService.replyOrFollowUp(interaction, {
      embeds: [new SuccessEmbed('SUCCESS_GENERIC').setTitle('Status update scheduled')],
    });
  }
}
