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
import { AuthError, InternalError, ValidationError } from 'src/errors';
import { AccessMode, CrewMemberAccess, TicketTag } from 'src/types';
import { BotService, CommandInteraction } from 'src/bot/bot.service';
import { SuccessEmbed } from 'src/bot/embed';
import { EchoCommand } from 'src/core/echo.command-group';
import { DiscordExceptionFilter } from 'src/bot/bot-exception.filter';
import { GuildService } from 'src/core/guild/guild.service';
import { GuildSettingName } from 'src/core/guild/guild-setting.entity';
import { CrewService } from 'src/core/crew/crew.service';
import { CrewSettingName } from 'src/core/crew/crew-setting.entity';
import { CrewAction } from 'src/core/crew/crew-access.entity';
import { AccessDecision } from 'src/core/access/access-decision';
import { CrewSettingUpdateModalBuilder } from 'src/core/crew/crew-update.modal';
import { AccessService } from 'src/core/access/access.service';
import { AccessDecisionBuilder } from 'src/core/access/access-decision.builder';
import { SelectCrewCommandParams } from 'src/core/crew/crew.command';
import { CrewSelectAutocompleteInterceptor } from 'src/core/crew/crew-select.interceptor';
import { TicketService } from './ticket.service';
import { SelectTicketDto } from './ticket.entity';
import { TicketCreatePromptBuilder } from './ticket-create.prompt';
import { TicketInfoPromptBuilder } from './ticket-info.prompt';
import {
  makeProxyTicketMessage,
  supportedLocales,
  TicketCreateModalBuilder,
} from './ticket-create.modal';
import { TicketDeclineModalBuilder } from './ticket-decline.modal';
import { TicketUpdateModalBuilder } from './ticket-update.modal';

export const TicketActionToTag = {
  accept: TicketTag.ACCEPTED,
  decline: TicketTag.DECLINED,
  active: TicketTag.IN_PROGRESS,
  repeat: TicketTag.REPEATABLE,
  delivery: TicketTag.DELIVERY,
  hold: TicketTag.HOLD,
  queued: TicketTag.QUEUED,
  done: TicketTag.DONE,
  close: TicketTag.ABANDONED,
} as const;

export class TicketDeclineReasonCommandParams {
  @StringOption({
    name: 'reason',
    description: 'Provide a reason',
    required: true,
  })
  reason: string;
}

export class TicketPromptCommandParams {
  @StringOption({
    name: 'crew',
    description: 'Select a crew',
    autocomplete: true,
    required: false,
  })
  crew: string;

  @StringOption({
    name: 'description',
    description: 'Override prompt text',
    required: false,
  })
  description: string;
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
    @Options() data: TicketPromptCommandParams,
  ) {
    try {
      BigInt(data.crew);
    } catch {
      return interaction.reply({ ephemeral: true, content: 'Invalid crew selected' });
    }

    const prompt = new TicketCreatePromptBuilder();

    if (data.description) {
      prompt.addCustomCreateTicketMessage(data.description);
    } else {
      prompt.addCreateTicketMessage();
    }

    if (data.crew) {
      // Use selected crew
      prompt.addCreateButton({ crewSf: data.crew });
    } else {
      // Show crew selector
      const crews = await this.crewService
        .query()
        .byGuild({ guildSf: interaction.guildId })
        .getMany();

      prompt.addCrewSelector(crews);
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
    const locale = supportedLocales.find((l) => interaction.locale.startsWith(l));
    const modal = new TicketCreateModalBuilder().addForm(
      {
        crewSf: data.crew || interaction.channelId,
      },
      interaction.user.id,
      locale,
    );
    return interaction.showModal(modal);
  }

  @Button('ticket/start/:crew')
  async onCrewTicketStart(
    @Context() [interaction]: ButtonContext,
    @ComponentParam('crew') channelRef: Snowflake,
  ) {
    const locale = supportedLocales.find((l) => interaction.locale.startsWith(l));
    const modal = new TicketCreateModalBuilder().addForm(
      {
        crewSf: channelRef || interaction.channelId,
      },
      interaction.user.id,
      locale,
    );
    return interaction.showModal(modal);
  }

  @StringSelect('ticket/start')
  async onTicketStart(
    @Context() [interaction]: StringSelectContext,
    @SelectedStrings() [selected]: string[],
  ) {
    const locale = supportedLocales.find((l) => interaction.locale.startsWith(l));
    const modal = new TicketCreateModalBuilder().addForm(
      {
        crewSf: selected,
      },
      interaction.user.id,
      locale,
    );
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
      channelRef = guild.getConfig()['guild.triage_crew_sf'];
    }

    const locale = supportedLocales.find((l) => interaction.locale.startsWith(l));
    const modal = new TicketCreateModalBuilder().addForm(
      { crewSf: channelRef },
      authorRef,
      locale,
      {
        detail: {
          value: makeProxyTicketMessage(
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
      .withCrewAccess()
      .byTicket({ threadSf: threadRef })
      .getOneOrFail();

    const accessArgs = await this.accessService.getTestArgs(interaction);

    if (
      !new AccessDecisionBuilder()
        .addRule({ guildAdmin: true })
        .addRule({ crew: { id: ticket.crew.id } })
        .build()
        .permit(...accessArgs) &&
      !ticket.crew
        .getAccessRulesForAction(CrewAction.CREW_TICKET_MANAGE, AccessMode.WRITE)
        .some((access) => AccessDecision.fromEntry(access.rule).permit(...accessArgs))
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

  @Modal('ticket/create/:crew/:author')
  async onTicketSubmit(
    @Context() [interaction]: ModalContext,
    @ModalParam('crew') crewRef: Snowflake,
    @ModalParam('author') authorRef: Snowflake,
  ) {
    const memberRef = interaction.member?.user?.id ?? interaction.user?.id;
    const who = interaction.fields.getTextInputValue('ticket/form/who');
    const what = interaction.fields.getTextInputValue('ticket/form/what');
    const detail = interaction.fields.getTextInputValue('ticket/form/detail');
    const where = interaction.fields.getTextInputValue('ticket/form/where');
    const when = interaction.fields.getTextInputValue('ticket/form/when');

    const regiment = who && !who.toLowerCase().includes('none') ? `[${who.toUpperCase()}] ` : '';
    const title = [regiment, what].join('');

    const content = [
      '## What do you need?',
      what,
      '',
      detail,
      '',
      '## Where is it needed?',
      where,
      '',
      '## When do you need it by?',
      when,
      '',
      '',
    ].join('\n');

    const guild = await this.guildService
      .query()
      .byGuild({ guildSf: interaction.guildId })
      .getOneOrFail();
    const guildSettings = guild.getConfig();
    const crew =
      (await this.crewService.query().byCrew({ crewSf: crewRef }).getOne()) ??
      (await this.crewService
        .query()
        .byCrew({ crewSf: guildSettings[GuildSettingName.GUILD_TRIAGE_CREW] })
        .getOneOrFail());
    const result = await this.ticketService.createTicket(crew, {
      name: title,
      content,
      crewId: crew.id,
      createdBy: authorRef,
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

  @Modal('ticket/update/:thread')
  async onTicketUpdate(
    @Context() [interaction]: ModalContext,
    @ModalParam('thread') threadRef: Snowflake,
  ) {
    await interaction.deferReply({ ephemeral: true });
    const memberRef = interaction.member?.user?.id ?? interaction.user?.id;
    const ticket = await this.ticketService
      .query()
      .withCrew()
      .withCrewAccess()
      .byChannel(threadRef || interaction.channelId)
      .getOne();

    const accessArgs = await this.accessService.getTestArgs(interaction);

    if (
      !new AccessDecisionBuilder()
        .addRule({ guildAdmin: true })
        .addRule({ crew: { id: ticket.crew.id } })
        .build()
        .permit(...accessArgs) &&
      !ticket.crew
        .getAccessRulesForAction(CrewAction.CREW_TICKET_MANAGE, AccessMode.WRITE)
        .some((access) => AccessDecision.fromEntry(access.rule).permit(...accessArgs))
    ) {
      throw new AuthError('FORBIDDEN', 'Only crew members can perform this action').asDisplayable();
    }

    const name = interaction.fields.getTextInputValue('ticket/name');
    await this.ticketService.updateTicket({ id: ticket.id }, { name, updatedBy: memberRef });

    await this.botService.replyOrFollowUp(interaction, {
      embeds: [new SuccessEmbed('SUCCESS_GENERIC').setTitle('Ticket updated')],
    });
  }

  @Modal('ticket/decline/:thread')
  async onTicketDecline(
    @Context() [interaction]: ModalContext,
    @ModalParam('thread') threadRef: Snowflake,
  ) {
    await interaction.deferReply({ ephemeral: true });
    const memberRef = interaction.member?.user?.id ?? interaction.user?.id;
    const ticket = await this.ticketService
      .query()
      .withCrew()
      .withCrewAccess()
      .byTicket({ threadSf: threadRef })
      .getOneOrFail();

    const accessArgs = await this.accessService.getTestArgs(interaction);

    if (
      !new AccessDecisionBuilder()
        .addRule({ guildAdmin: true })
        .addRule({ crew: { id: ticket.crew.id } })
        .build()
        .permit(...accessArgs) &&
      !ticket.crew
        .getAccessRulesForAction(CrewAction.CREW_TICKET_MANAGE, AccessMode.WRITE)
        .some((access) => AccessDecision.fromEntry(access.rule).permit(...accessArgs))
    ) {
      throw new AuthError('FORBIDDEN', 'Only crew members can perform this action').asDisplayable();
    }

    const reason = interaction.fields.getTextInputValue('ticket/decline/reason');

    const result = await this.ticketService.updateTicket(
      { threadSf: threadRef },
      { state: TicketTag.DECLINED, updatedBy: memberRef },
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
    const ticketRef: SelectTicketDto = { threadSf: interaction.channelId };
    const ticket = await this.ticketService
      .query()
      .withCrew()
      .withCrewAccess()
      .byTicket(ticketRef)
      .getOneOrFail();

    const accessArgs = await this.accessService.getTestArgs(interaction);

    if (
      !new AccessDecisionBuilder()
        .addRule({ guildAdmin: true })
        .addRule({ crew: { id: ticket.crew.id } })
        .build()
        .permit(...accessArgs) &&
      !ticket.crew
        .getAccessRulesForAction(CrewAction.CREW_TICKET_MANAGE, AccessMode.WRITE)
        .some((access) => AccessDecision.fromEntry(access.rule).permit(...accessArgs))
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

  @UseInterceptors(CrewSelectAutocompleteInterceptor)
  @Subcommand({
    name: 'set_help',
    description: 'Set crew help message for this crew. Crew admin only.',
    dmPermission: false,
  })
  async onCrewTicketHelpUpdate(
    @Context() [interaction]: SlashCommandContext,
    @Options() data: SelectCrewCommandParams,
  ) {
    let crew = await this.crewService
      .query()
      .byCrew({ crewSf: data.crew || interaction.channelId })
      .withSettings()
      .getOne();

    if (!crew) {
      const ticket = await this.ticketService
        .query()
        .withCrew()
        .withCrewAccess()
        .byChannel(data.crew || interaction.channelId)
        .getOne();

      if (ticket) {
        crew = ticket.crew;
      }
    }

    if (!crew) {
      throw new ValidationError('NOT_FOUND', 'Not a valid crew or ticket');
    }

    const accessArgs = await this.accessService.getTestArgs(interaction);

    if (
      !new AccessDecisionBuilder()
        .addRule({ guildAdmin: true })
        .addRule({ crew: { id: crew.id }, crewRole: CrewMemberAccess.ADMIN })
        .build()
        .permit(...accessArgs) &&
      !crew
        .getAccessRulesForAction(CrewAction.CREW_SETTING_MANAGE, AccessMode.WRITE)
        .some((access) => AccessDecision.fromEntry(access.rule).permit(...accessArgs))
    ) {
      throw new AuthError(
        'FORBIDDEN',
        'Only crew administrators can perform this action',
      ).asDisplayable();
    }

    const { [CrewSettingName.CREW_TICKET_HELP_TEXT]: ticketHelp } = crew.getConfig();
    const modal = new CrewSettingUpdateModalBuilder()
      .forCrew(crew)
      .addField(
        CrewSettingName.CREW_TICKET_HELP_TEXT,
        'Help Text',
        ticketHelp && ticketHelp.asString(),
      );
    return interaction.showModal(modal);
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
      .withCrew()
      .withCrewAccess()
      .byTicket({ threadSf: interaction.channelId })
      .getOneOrFail();

    const accessArgs = await this.accessService.getTestArgs(interaction);

    if (
      !new AccessDecisionBuilder()
        .addRule({ guildAdmin: true })
        .addRule({ crew: { id: ticket.crew.id } })
        .build()
        .permit(...accessArgs) &&
      !ticket.crew
        .getAccessRulesForAction(CrewAction.CREW_TICKET_MANAGE, AccessMode.WRITE)
        .some((access) => AccessDecision.fromEntry(access.rule).permit(...accessArgs))
    ) {
      throw new AuthError('FORBIDDEN', 'Only crew members can perform this action').asDisplayable();
    }

    const prompt = new TicketInfoPromptBuilder()
      .addGenericMessage('Select action')
      .addTriageControls(ticket);
    await this.botService.replyOrFollowUp(interaction, prompt.build());
  }

  @Subcommand({
    name: 'refresh',
    description: 'Refresh ticket state. For debugging purposes. Crew member only.',
    dmPermission: false,
  })
  async onTicketRefreshCommand(@Context() [interaction]: SlashCommandContext) {
    return this.ticketRefreshCommand([interaction], interaction.channelId);
  }

  @Button('ticket/rename/:thread')
  async onTicketRename(
    @Context() [interaction]: ButtonContext,
    @ComponentParam('thread') threadRef: Snowflake,
  ) {
    const ticket = await this.ticketService
      .query()
      .withCrew()
      .withCrewAccess()
      .byChannel(threadRef || interaction.channelId)
      .getOne();

    const accessArgs = await this.accessService.getTestArgs(interaction);

    if (
      !new AccessDecisionBuilder()
        .addRule({ guildAdmin: true })
        .addRule({ crew: { id: ticket.crew.id } })
        .build()
        .permit(...accessArgs) &&
      !ticket.crew
        .getAccessRulesForAction(CrewAction.CREW_TICKET_MANAGE, AccessMode.WRITE)
        .some((access) => AccessDecision.fromEntry(access.rule).permit(...accessArgs))
    ) {
      throw new AuthError('FORBIDDEN', 'Only crew members can perform this action').asDisplayable();
    }

    const modal = new TicketUpdateModalBuilder().forTicket(ticket).addTicketNameField(ticket);
    return interaction.showModal(modal);
  }

  @Button('ticket/refresh/:thread')
  async onTicketRefresh(
    @Context() [interaction]: ButtonContext,
    @ComponentParam('thread') threadRef: Snowflake,
  ) {
    return this.ticketRefreshCommand([interaction], threadRef || interaction.channelId);
  }

  async ticketRefreshCommand([interaction]: [CommandInteraction], threadSf: Snowflake) {
    await interaction.deferReply({ ephemeral: true });
    const accessArgs = await this.accessService.getTestArgs(interaction);
    const ticket = await this.ticketService
      .query()
      .withCrew()
      .withCrewAccess()
      .withCrewSettings()
      .withTeam()
      .byTicket({ threadSf })
      .getOneOrFail();

    if (
      !new AccessDecisionBuilder()
        .addRule({ guildAdmin: true })
        .addRule({ crew: { id: ticket.crew.id } })
        .build()
        .permit(...accessArgs) &&
      !ticket.crew
        .getAccessRulesForAction(CrewAction.CREW_TICKET_MANAGE, AccessMode.WRITE)
        .some((access) => AccessDecision.fromEntry(access.rule).permit(...accessArgs))
    ) {
      throw new AuthError('FORBIDDEN', 'Only crew members can perform this action').asDisplayable();
    }

    await this.ticketService.refreshTicket(ticket);

    await this.botService.replyOrFollowUp(interaction, {
      embeds: [new SuccessEmbed('SUCCESS_GENERIC').setTitle('Ticket display refreshed')],
    });
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
    await interaction.deferReply({ ephemeral: true });
    const memberRef = interaction.member?.user?.id ?? interaction.user?.id;
    const ticket = await this.ticketService
      .query()
      .withCrew()
      .withCrewAccess()
      .byTicket({ threadSf: interaction.channelId })
      .getOneOrFail();

    const accessArgs = await this.accessService.getTestArgs(interaction);

    if (
      !new AccessDecisionBuilder()
        .addRule({ guildAdmin: true })
        .addRule({ crew: { id: ticket.crew.id } })
        .build()
        .permit(...accessArgs) &&
      !ticket.crew
        .getAccessRulesForAction(CrewAction.CREW_TICKET_MANAGE, AccessMode.WRITE)
        .some((access) => AccessDecision.fromEntry(access.rule).permit(...accessArgs))
    ) {
      throw new AuthError('FORBIDDEN', 'Only crew members can perform this action').asDisplayable();
    }

    const result = await this.ticketService.updateTicket(
      { id: ticket.id },
      { state: tag, updatedBy: memberRef },
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
    name: 'queued',
    description: 'Ticket added to queue. Crew members only',
    dmPermission: false,
  })
  async onTicketQueuedCommand(@Context() context: SlashCommandContext) {
    return this.lifecycleCommand(context, TicketTag.QUEUED);
  }

  @Subcommand({
    name: 'done',
    description: 'Complete a ticket. Crew members only',
    dmPermission: false,
  })
  async onTicketDoneCommand(@Context() context: SlashCommandContext) {
    return this.lifecycleCommand(context, TicketTag.DONE);
  }

  @Subcommand({
    name: 'pickup',
    description: 'Mark a ticket ready for pick-up/delivery. Crew members only',
    dmPermission: false,
  })
  async onTicketPickupCommand(@Context() context: SlashCommandContext) {
    return this.lifecycleCommand(context, TicketTag.DELIVERY);
  }

  @Subcommand({
    name: 'delivery',
    description: 'Mark a ticket ready for pick-up/delivery. Crew members only',
    dmPermission: false,
  })
  async onTicketDeliveryCommand(@Context() context: SlashCommandContext) {
    return this.lifecycleCommand(context, TicketTag.DELIVERY);
  }

  @Subcommand({
    name: 'hold',
    description: 'Mark a ticket on-hold. Crew members only',
    dmPermission: false,
  })
  async onTicketHoldCommand(@Context() context: SlashCommandContext) {
    return this.lifecycleCommand(context, TicketTag.HOLD);
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
