import { Injectable, Logger, UseFilters, UseInterceptors } from '@nestjs/common';
import { QueryFailedError } from 'typeorm';
import {
  BooleanOption,
  Button,
  ButtonContext,
  ChannelOption,
  ComponentParam,
  Context,
  MemberOption,
  Modal,
  ModalContext,
  ModalParam,
  Options,
  SlashCommand,
  SlashCommandContext,
  StringOption,
  Subcommand,
  TargetUser,
  UserCommand,
  UserCommandContext,
} from 'necord';
import {
  ChannelType,
  GuildChannel,
  GuildMember,
  PermissionsBitField,
  Snowflake,
  User,
} from 'discord.js';
import { compact } from 'lodash';
import { AuthError, DatabaseError, ValidationError } from 'src/errors';
import { AccessMode, CrewMemberAccess } from 'src/types';
import { ErrorEmbed, SuccessEmbed } from 'src/bot/embed';
import { EchoCommand } from 'src/core/echo.command-group';
import { BotService } from 'src/bot/bot.service';
import { DiscordExceptionFilter } from 'src/bot/bot-exception.filter';
import { GuildService } from 'src/core/guild/guild.service';
import { TeamSelectAutocompleteInterceptor } from 'src/core/team/team-select.interceptor';
import { AccessDecisionBuilder } from 'src/core/access/access-decision.builder';
import { AccessService } from 'src/core/access/access.service';
import { GuildAction } from 'src/core/guild/guild-access.entity';
import { AccessDecision } from 'src/core/access/access-decision';
import { CrewService } from './crew.service';
import { CrewSelectAutocompleteInterceptor } from './crew-select.interceptor';
import { CrewShareAutocompleteInterceptor } from './share/crew-share.interceptor';
import { CrewMemberService } from './member/crew-member.service';
import { CrewShareService } from './share/crew-share.service';
import { CrewLogService } from './log/crew-log.service';
import { Crew, CrewConfigValue, SelectCrewDto } from './crew.entity';
import { CrewDeletePromptBuilder } from './crew-delete.prompt';
import { CrewDeleteModalBuilder } from './crew-delete.modal';
import { CrewLogModalBuilder } from './crew-log.modal';
import { CrewSettingName } from './crew-setting.entity';
import { CrewGrantAccessAutocompleteInterceptor } from './crew-grant-access.interceptor';
import { CrewAction } from './crew-access.entity';
import { CrewSettingAutocompleteInterceptor } from './crew-setting.interceptor';

export class CreateCrewCommandParams {
  @StringOption({
    name: 'team',
    description: 'Select a team',
    autocomplete: true,
    required: true,
  })
  team: string;

  @StringOption({
    name: 'name',
    description: 'Crew name. Describe what your crew does.',
    required: true,
  })
  name: string;

  // @BooleanOption({
  //   name: 'text_channel',
  //   description: 'Should the crew have a text channel?',
  //   required: true,
  // })
  // text: boolean;

  @BooleanOption({
    name: 'voice_channel',
    description: 'Should the crew have a voice channel?',
    required: true,
  })
  voice: boolean;

  @BooleanOption({
    name: 'triage',
    description: 'Should the ticket move prompt appear on every ticket?',
    required: true,
  })
  triage: boolean;

  @StringOption({
    name: 'short_name',
    description: 'A short name or abbreviation for smaller UI.',
    required: false,
  })
  shortName?: string;
}

export class SelectCrewCommandParams {
  @StringOption({
    name: 'crew',
    description: 'Select a crew',
    autocomplete: true,
    required: false,
  })
  crew: string;
}

export class ArchiveCrewCommandParams {
  @StringOption({
    name: 'crew',
    description: 'Select a crew',
    autocomplete: true,
    required: false,
  })
  crew: string;

  @ChannelOption({
    name: 'archive',
    description:
      'Category where the crew should be archived. Crew will be deleted if not provided.',
    channel_types: [ChannelType.GuildCategory],
    required: false,
  })
  archive: GuildChannel;

  @StringOption({
    name: 'tag',
    description: 'Suffix for archived channels. Useful for keeping track of all archived channels.',
    required: false,
  })
  tag: string;
}

export class PurgeCrewsCommandParams {
  @ChannelOption({
    name: 'archive',
    description:
      'Category where the crew should be archived. Crew will be deleted if not provided.',
    channel_types: [ChannelType.GuildCategory],
    required: false,
  })
  archive: GuildChannel;

  @StringOption({
    name: 'tag',
    description: 'Suffix for archived channels. Useful for keeping track of all archived channels.',
    required: false,
  })
  tag: string;
}

export class SetFlagCommandParams {
  @BooleanOption({
    name: 'flag',
    description: 'Set flag enabled or disabled for this crew',
    required: true,
  })
  value: boolean;

  @StringOption({
    name: 'crew',
    description: 'Select a crew',
    autocomplete: true,
    required: false,
  })
  crew: string;
}

export class SelectCrewMemberCommandParams {
  @MemberOption({
    name: 'member',
    description: 'Select a crew member',
    required: true,
  })
  member: GuildMember;

  @StringOption({
    name: 'crew',
    description: 'Select a crew',
    autocomplete: true,
    required: false,
  })
  crew: string;
}

export class ShareCrewCommandParams {
  @StringOption({
    name: 'guild',
    description: 'Select a guild',
    autocomplete: true,
    required: true,
  })
  guild: string;

  @StringOption({
    name: 'crew',
    description: 'Select a crew',
    autocomplete: true,
    required: false,
  })
  crew: string;
}

class SettingTextCommandParams {
  @StringOption({
    name: 'setting',
    description: 'Select a setting',
    autocomplete: true,
    required: true,
  })
  setting: CrewSettingName;

  @StringOption({
    name: 'value',
    description: 'A value',
    required: true,
  })
  value: string;

  @StringOption({
    name: 'crew',
    description: 'Select a crew',
    autocomplete: true,
    required: false,
  })
  crew: string;
}

class SettingBooleanCommandParams {
  @StringOption({
    name: 'setting',
    description: 'Select a setting',
    autocomplete: true,
    required: true,
  })
  setting: CrewSettingName;

  @BooleanOption({
    name: 'flag',
    description: 'Set flag enabled or disabled for this crew',
    required: true,
  })
  value: boolean;

  @StringOption({
    name: 'crew',
    description: 'Select a crew',
    autocomplete: true,
    required: false,
  })
  crew: string;
}

class GrantCrewAccessCommandParams {
  @StringOption({
    name: 'action',
    description: 'Select an action',
    autocomplete: true,
    required: true,
  })
  action: GuildAction;

  @StringOption({
    name: 'rule',
    description: 'Select a rule',
    autocomplete: true,
    required: true,
  })
  ruleId: string;

  @StringOption({
    name: 'access',
    description: 'Level of access',
    autocomplete: true,
    required: true,
  })
  access: string;

  @StringOption({
    name: 'crew',
    description: 'Select a crew',
    autocomplete: true,
    required: false,
  })
  crew: string;
}

@Injectable()
@EchoCommand({
  name: 'crew',
  description: 'Manage crews',
})
@UseFilters(DiscordExceptionFilter)
export class CrewCommand {
  private readonly logger = new Logger(CrewCommand.name);

  constructor(
    private readonly botService: BotService,
    private readonly guildService: GuildService,
    private readonly crewService: CrewService,
    private readonly memberService: CrewMemberService,
    private readonly shareService: CrewShareService,
    private readonly logService: CrewLogService,
    private readonly accessService: AccessService,
  ) {}

  @UseInterceptors(TeamSelectAutocompleteInterceptor)
  @Subcommand({
    name: 'create',
    description: 'Create a new crew',
    dmPermission: false,
  })
  async onCreateCrew(
    @Context() [interaction]: SlashCommandContext,
    @Options() data: CreateCrewCommandParams,
  ) {
    await interaction.deferReply({ ephemeral: true });

    const guild = await this.guildService
      .query()
      .byGuild({ guildSf: interaction.guildId })
      .withAccessRules()
      .getOneOrFail();

    const accessArgs = await this.accessService.getTestArgs(interaction);

    const skipApproval =
      guild
        .getAccessRulesForAction(GuildAction.CREW_MANAGE, AccessMode.ADMIN)
        .some((entry) => AccessDecision.fromEntry(entry.rule).permit(...accessArgs)) ||
      new AccessDecisionBuilder()
        .addRule({ guildAdmin: true })
        .build()
        .permit(...accessArgs);
    const isMember =
      skipApproval ||
      guild
        .getAccessRulesForAction(GuildAction.CREW_MANAGE, AccessMode.WRITE)
        .some((entry) => AccessDecision.fromEntry(entry.rule).permit(...accessArgs));

    if (!isMember) {
      throw new AuthError('FORBIDDEN', 'Not allowed to create crews').asDisplayable();
    }

    await this.crewService.registerCrew(
      {
        name: data.name,
        shortName: data.shortName,
        settings: {
          [CrewSettingName.CREW_TRIAGE]: data.triage,
          [CrewSettingName.CREW_VOICE_CHANNEL]: data.voice,
          [CrewSettingName.CREW_TEXT_CHANNEL]: true,
        },
        teamId: data.team,
        createdBy: interaction.member?.user?.id ?? interaction.user?.id,
      },
      { skipApproval },
    );

    const embed = new SuccessEmbed('SUCCESS_GENERIC').setTitle('Crew registered');

    if (skipApproval) {
      embed.setTitle('Crew registered');
    } else {
      embed
        .setTitle('Crew awaiting approval')
        .setDescription('Your crew will be reviewed soon! Please be patient.');
    }

    await this.botService.replyOrFollowUp(interaction, {
      embeds: [embed],
    });
  }

  @UseInterceptors(CrewSelectAutocompleteInterceptor)
  @Subcommand({
    name: 'reconcile',
    description: "Create crew channels and roles, if they don't already exist",
    dmPermission: false,
  })
  async onCrewReconcile(
    @Context() [interaction]: SlashCommandContext,
    @Options() data: SelectCrewCommandParams,
  ) {
    const accessArgs = await this.accessService.getTestArgs(interaction);
    const crew = await this.crewService
      .query()
      .byGuild({ guildSf: interaction.guildId })
      .byCrew({ crewSf: data.crew || interaction.channelId })
      .getOneOrFail();

    if (
      new AccessDecisionBuilder()
        .addRule({ guildAdmin: true })
        .addRule({ crew: { id: crew.id }, crewRole: CrewMemberAccess.ADMIN })
        .build()
        .deny(...accessArgs)
    ) {
      throw new AuthError(
        'FORBIDDEN',
        'Only a crew administrator can perform this action',
      ).asDisplayable();
    }

    await this.crewService.reconcileCrew({ id: crew.id });

    await this.botService.replyOrFollowUp(interaction, {
      embeds: [new SuccessEmbed('SUCCESS_GENERIC').setTitle('Crew reconcile scheduled')],
    });
  }

  async setConfig<K extends keyof CrewConfigValue>(
    key: K,
    value: CrewConfigValue[K],
    crewRef: SelectCrewDto,
    [interaction]: SlashCommandContext,
  ) {
    const crew = await this.crewService
      .query()
      .byCrew(crewRef)
      .withSettings()
      .withAccessRules()
      .getOneOrFail();

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
      throw new AuthError('FORBIDDEN', 'You do not have access');
    }

    await this.crewService.setConfig(
      { crewId: crew.id, updatedBy: interaction.user.id },
      { [key]: value },
    );

    await this.botService.replyOrFollowUp(interaction, {
      embeds: [new SuccessEmbed('SUCCESS_GENERIC').setTitle('Configuration updated')],
    });
  }

  @UseInterceptors(CrewSettingAutocompleteInterceptor)
  @Subcommand({
    name: 'set_flag',
    description: 'Update guild settings (boolean)',
    dmPermission: false,
  })
  async onCrewSettingBoolean(
    @Context() context: SlashCommandContext,
    @Options() data: SettingBooleanCommandParams,
  ) {
    if (!data.value && data.value !== false) {
      throw new ValidationError('VALIDATION_FAILED', 'Invalid value').asDisplayable();
    }

    const [interaction] = context;
    return this.setConfig(
      data.setting,
      JSON.stringify(data.value),
      { crewSf: data.crew || interaction.channelId },
      context,
    );
  }

  @UseInterceptors(CrewSettingAutocompleteInterceptor)
  @Subcommand({
    name: 'set_text',
    description: 'Update guild settings (text)',
    dmPermission: false,
  })
  async onCrewSettingText(
    @Context() context: SlashCommandContext,
    @Options() data: SettingTextCommandParams,
  ) {
    if (!data.value) {
      throw new ValidationError('VALIDATION_FAILED', 'Invalid value').asDisplayable();
    }

    const [interaction] = context;
    return this.setConfig(
      data.setting,
      data.value,
      { crewSf: data.crew || interaction.channelId },
      context,
    );
  }

  @UseInterceptors(CrewGrantAccessAutocompleteInterceptor)
  @Subcommand({
    name: 'grant',
    description: 'Grant crew-level privileges to bot features',
    dmPermission: false,
  })
  async onGrantCrewAccess(
    @Context() [interaction]: SlashCommandContext,
    @Options() options: GrantCrewAccessCommandParams,
  ) {
    const crew = await this.crewService
      .query()
      .byGuild({ guildSf: interaction.guildId })
      .byCrew({ crewSf: options.crew || interaction.channelId })
      .withSettings()
      .withoutPending()
      .getOneOrFail();
    const accessArgs = await this.accessService.getTestArgs(interaction);

    if (
      new AccessDecisionBuilder()
        .addRule({ guildAdmin: true })
        .addRule({ crew: { id: crew.id }, crewRole: CrewMemberAccess.ADMIN })
        .build()
        .deny(...accessArgs)
    ) {
      throw new AuthError('FORBIDDEN', 'Only crew admins can use this command').asDisplayable();
    }

    const rule = await this.accessService
      .query()
      .byGuild({ guildSf: interaction.guildId })
      .byEntry({ id: options.ruleId })
      .getOneOrFail();

    if (!rule) {
      throw new ValidationError('NOT_FOUND', 'Rule does not exist').asDisplayable();
    }

    const access = Object.entries(AccessMode).find(
      ([k, v]) => k === options.access,
    )[1] as AccessMode;

    const action = Object.entries(CrewAction).find(
      ([k, v]) => k === options.action,
    )[1] as CrewAction;

    try {
      await this.crewService.grantAccess({
        crewId: crew.id,
        ruleId: options.ruleId,
        action,
        access,
        createdBy: interaction.user.id,
      });
    } catch (err) {
      if (err instanceof QueryFailedError && err.driverError.code === '23505') {
        throw new ValidationError(
          'VALIDATION_FAILED',
          `Rule '${rule.description}' already exists for ${crew.name}`,
          [err],
        ).asDisplayable();
      }
    }

    await this.botService.replyOrFollowUp(interaction, {
      embeds: [new SuccessEmbed('SUCCESS_GENERIC').setTitle('Access granted')],
    });
  }

  private async joinCrew(
    @Context() [interaction]: SlashCommandContext,
    @Options() data: SelectCrewCommandParams,
  ) {
    const channelRef = data.crew || interaction.channelId;
    const memberRef = interaction?.member?.user?.id ?? interaction?.user?.id;
    const channel = await interaction.guild.channels.fetch(channelRef);

    if (!channel.permissionsFor(memberRef).has(PermissionsBitField.Flags.ViewChannel)) {
      throw new AuthError('FORBIDDEN', 'Forbidden');
    }

    const crew = await this.crewService.query().byCrew({ crewSf: channelRef }).getOneOrFail();

    await this.memberService.registerCrewMember(crew, memberRef, CrewMemberAccess.MEMBER);

    await this.botService.replyOrFollowUp(interaction, {
      embeds: [new SuccessEmbed('SUCCESS_GENERIC').setTitle('Joined crew')],
    });
  }

  @UseInterceptors(CrewSelectAutocompleteInterceptor)
  @Subcommand({
    name: 'join',
    description: 'Join a crew',
    dmPermission: false,
  })
  async onJoinCrew(
    @Context() context: SlashCommandContext,
    @Options() data: SelectCrewCommandParams,
  ) {
    return this.joinCrew(context, data);
  }

  @UseInterceptors(CrewSelectAutocompleteInterceptor)
  @SlashCommand({
    name: 'joincrew',
    description: 'Join a crew',
    dmPermission: false,
  })
  async onGlobalJoinCrew(
    @Context() context: SlashCommandContext,
    @Options() data: SelectCrewCommandParams,
  ) {
    return this.joinCrew(context, data);
  }

  @Button('crew/join')
  async onCrewChannelJoinRequest(@Context() context: ButtonContext) {
    return this.onCrewJoinRequest(context);
  }

  @Button('crew/join/:crew')
  async onCrewJoinRequest(
    @Context() [interaction]: ButtonContext,
    @ComponentParam('crew') crewRef?: Snowflake,
  ) {
    const memberRef = interaction?.member?.user?.id ?? interaction?.user?.id;
    const channel = await interaction.guild.channels.fetch(crewRef || interaction.channelId);

    if (!channel.permissionsFor(memberRef).has(PermissionsBitField.Flags.ViewChannel)) {
      throw new AuthError('FORBIDDEN', 'Forbidden');
    }

    const crew = await this.crewService
      .query()
      .byCrew({ crewSf: crewRef || interaction.channelId })
      .getOneOrFail();

    await this.memberService.registerCrewMember(crew, memberRef, CrewMemberAccess.MEMBER);

    await this.botService.replyOrFollowUp(interaction, {
      embeds: [new SuccessEmbed('SUCCESS_GENERIC').setTitle('Joined crew')],
    });
  }

  @UseInterceptors(CrewSelectAutocompleteInterceptor)
  @Subcommand({
    name: 'prompt',
    description:
      'Show a generic prompt to join the crew of this channel. Must be run in crew channel.',
    dmPermission: false,
  })
  async onCrewJoinPrompt(@Context() [interaction]: SlashCommandContext) {
    const crew = await this.crewService
      .query()
      .byCrew({ crewSf: interaction.channelId })
      .getOneOrFail();
    await this.crewService.queueSendCrewInfo(crew);

    await this.botService.replyOrFollowUp(interaction, {
      embeds: [new SuccessEmbed('SUCCESS_GENERIC').setTitle('Done')],
    });
  }

  async leaveCrew(
    @Context() [interaction]: SlashCommandContext,
    @Options() data: SelectCrewCommandParams,
  ) {
    const crewSf = data.crew || interaction.channelId;
    const memberRef = interaction.member?.user?.id ?? interaction.user?.id;
    const crew = await this.crewService.query().byCrew({ crewSf }).getOneOrFail();
    const result = await this.memberService.removeCrewMember(crew, memberRef);

    if (result.affected) {
      await this.botService.replyOrFollowUp(interaction, {
        embeds: [
          new SuccessEmbed('SUCCESS_GENERIC')
            .setTitle('Left crew')
            .setDescription('You can join again any time.'),
        ],
      });
    } else {
      await this.botService.replyOrFollowUp(interaction, {
        embeds: [new ErrorEmbed('ERROR_GENERIC').setTitle('No change')],
      });
    }
  }

  @UseInterceptors(CrewSelectAutocompleteInterceptor)
  @Subcommand({
    name: 'leave',
    description: 'Leave a crew',
    dmPermission: false,
  })
  async onLeaveCrew(
    @Context() context: SlashCommandContext,
    @Options() data: SelectCrewCommandParams,
  ) {
    return this.leaveCrew(context, data);
  }

  @UseInterceptors(CrewSelectAutocompleteInterceptor)
  @SlashCommand({
    name: 'leavecrew',
    description: 'Leave a crew',
    dmPermission: false,
  })
  async onLeaveCrewAlias(
    @Context() context: SlashCommandContext,
    @Options() data: SelectCrewCommandParams,
  ) {
    return this.leaveCrew(context, data);
  }

  @UseInterceptors(CrewSelectAutocompleteInterceptor)
  @Subcommand({
    name: 'owner',
    description: 'Transfer ownership to another crew member. Owner only.',
    dmPermission: false,
  })
  async onSetOwner(
    @Context() [interaction]: SlashCommandContext,
    @Options() data: SelectCrewMemberCommandParams,
  ) {
    const accessArgs = await this.accessService.getTestArgs(interaction);
    const crew = await this.crewService
      .query()
      .byGuild({ guildSf: interaction.guildId })
      .byCrew({ crewSf: data.crew || interaction.channelId })
      .withoutPending()
      .getOneOrFail();

    if (
      new AccessDecisionBuilder()
        .addRule({ guildAdmin: true })
        .addRule({ crew: { id: crew.id }, crewRole: CrewMemberAccess.OWNER })
        .build()
        .deny(...accessArgs)
    ) {
      throw new AuthError(
        'FORBIDDEN',
        'Only crew owner or guild admin may transfer ownership',
      ).asDisplayable();
    }

    const targetMember = await this.memberService
      .query()
      .byCrewMember({ crewId: crew.id, memberSf: data.member.id })
      .withoutDeletedCrews()
      .getOne();

    if (!targetMember) {
      throw new ValidationError(
        'VALIDATION_FAILED',
        `${data.member} is not a member of this team`,
      ).asDisplayable();
    }

    await this.memberService.updateCrewMember(
      { crewId: crew.id, memberSf: targetMember.memberSf },
      {
        access: CrewMemberAccess.OWNER,
      },
    );

    const oldOwners = await this.memberService
      .query()
      .byCrew({ id: crew.id })
      .byAccess(CrewMemberAccess.OWNER)
      .withoutDeletedCrews()
      .getMany();

    for (const owner of oldOwners) {
      if (owner.memberSf === targetMember.memberSf) {
        continue;
      }

      await this.memberService.updateCrewMember(
        { crewId: owner.crewId, memberSf: owner.memberSf },
        {
          access: CrewMemberAccess.ADMIN,
        },
      );
    }

    await this.botService.replyOrFollowUp(interaction, {
      embeds: [new SuccessEmbed('SUCCESS_GENERIC').setTitle('Crew ownership transferred')],
    });
  }

  @UseInterceptors(CrewSelectAutocompleteInterceptor)
  @Subcommand({
    name: 'admin',
    description: 'Give a member admin privileges. Admin only.',
    dmPermission: false,
  })
  async onSetAdmin(
    @Context() [interaction]: SlashCommandContext,
    @Options() data: SelectCrewMemberCommandParams,
  ) {
    const accessArgs = await this.accessService.getTestArgs(interaction);
    const crew = await this.crewService
      .query()
      .byGuild({ guildSf: interaction.guildId })
      .byCrew({ crewSf: data.crew || interaction.channelId })
      .withoutPending()
      .getOneOrFail();

    if (
      new AccessDecisionBuilder()
        .addRule({ guildAdmin: true })
        .addRule({ crew: { id: crew.id }, crewRole: CrewMemberAccess.ADMIN })
        .build()
        .deny(...accessArgs)
    ) {
      throw new AuthError(
        'FORBIDDEN',
        'Only a crew administrator can perform this action',
      ).asDisplayable();
    }

    const targetMember = await this.memberService
      .query()
      .byCrewMember({ crewId: crew.id, memberSf: data.member.id })
      .withoutDeletedCrews()
      .getOne();

    if (!targetMember) {
      throw new ValidationError(
        'VALIDATION_FAILED',
        `${data.member} is not a member of this team`,
      ).asDisplayable();
    }

    await this.memberService.updateCrewMember(targetMember, {
      access: CrewMemberAccess.ADMIN,
    });

    await this.botService.replyOrFollowUp(interaction, {
      embeds: [new SuccessEmbed('SUCCESS_GENERIC').setTitle('Promoted to crew administrator')],
    });
  }

  @UseInterceptors(CrewSelectAutocompleteInterceptor)
  @Subcommand({
    name: 'add',
    description: 'Add a crew member to a team. Admin only.',
    dmPermission: false,
  })
  async onAddCrewMember(
    @Context() [interaction]: SlashCommandContext,
    @Options() data: SelectCrewMemberCommandParams,
  ) {
    const accessArgs = await this.accessService.getTestArgs(interaction);
    const crew = await this.crewService
      .query()
      .byGuild({ guildSf: interaction.guildId })
      .byCrew({ crewSf: data.crew || interaction.channelId })
      .withoutPending()
      .getOneOrFail();

    if (
      new AccessDecisionBuilder()
        .addRule({ guildAdmin: true })
        .addRule({ crew: { id: crew.id }, crewRole: CrewMemberAccess.ADMIN })
        .build()
        .deny(...accessArgs)
    ) {
      throw new AuthError(
        'FORBIDDEN',
        'Only a crew administrator can perform this action',
      ).asDisplayable();
    }

    await this.memberService.registerCrewMember(crew, data.member.id, CrewMemberAccess.MEMBER);

    await this.botService.replyOrFollowUp(interaction, {
      embeds: [new SuccessEmbed('SUCCESS_GENERIC').setTitle('Crew member registered')],
    });
  }

  @UseInterceptors(CrewSelectAutocompleteInterceptor)
  @Subcommand({
    name: 'remove',
    description: 'Remove a team member from the team. Admin only.',
    dmPermission: false,
  })
  async onRemoveCrewMember(
    @Context() [interaction]: SlashCommandContext,
    @Options() data: SelectCrewMemberCommandParams,
  ) {
    const accessArgs = await this.accessService.getTestArgs(interaction);
    const crew = await this.crewService
      .query()
      .byGuild({ guildSf: interaction.guildId })
      .byCrew({ crewSf: data.crew || interaction.channelId })
      .withoutPending()
      .getOneOrFail();

    if (
      new AccessDecisionBuilder()
        .addRule({ guildAdmin: true })
        .addRule({ crew: { id: crew.id }, crewRole: CrewMemberAccess.ADMIN })
        .build()
        .deny(...accessArgs)
    ) {
      throw new AuthError(
        'FORBIDDEN',
        'Only a crew administrator can perform this action',
      ).asDisplayable();
    }

    await this.memberService.removeCrewMember(crew, data.member.id);

    await this.botService.replyOrFollowUp(interaction, {
      embeds: [new SuccessEmbed('SUCCESS_GENERIC').setTitle('Crew member removed')],
    });
  }

  @UseInterceptors(CrewSelectAutocompleteInterceptor)
  @Subcommand({
    name: 'archive',
    description: 'Archive a crew',
    dmPermission: false,
  })
  async onArchiveCrew(
    @Context() [interaction]: SlashCommandContext,
    @Options() data: ArchiveCrewCommandParams,
  ) {
    await interaction.deferReply({ ephemeral: true });

    const memberRef = interaction.member?.user?.id ?? interaction.user?.id;
    const accessArgs = await this.accessService.getTestArgs(interaction);
    const crewSf = data.crew || interaction.channelId;
    const crew = await this.crewService.query().byCrew({ crewSf }).getOneOrFail();

    if (crew.guild.guildSf !== interaction.guildId) {
      throw new AuthError(
        'FORBIDDEN',
        'You cannot archive crews shared from another guild',
      ).asDisplayable();
    }

    if (
      new AccessDecisionBuilder()
        .addRule({ guildAdmin: true })
        .addRule({ crew: { id: crew.id }, crewRole: CrewMemberAccess.ADMIN })
        .build()
        .deny(...accessArgs)
    ) {
      throw new AuthError(
        'FORBIDDEN',
        'Only a crew administrator can perform this action',
      ).asDisplayable();
    }

    await this.crewService.deregisterCrew({ id: crew.id }, memberRef, {
      tag: data.tag,
      archiveSf: data.archive?.id,
    });

    await this.botService.replyOrFollowUp(interaction, {
      embeds: [new SuccessEmbed('SUCCESS_GENERIC').setTitle('Crew archived')],
    });
  }

  @Subcommand({
    name: 'purge',
    description: 'Archives all crews',
    dmPermission: false,
  })
  async onPurgeCrews(
    @Context() [interaction]: SlashCommandContext,
    @Options() data: PurgeCrewsCommandParams,
  ) {
    const memberRef = interaction.member?.user?.id ?? interaction.user?.id;

    if (!interaction.memberPermissions.has(PermissionsBitField.Flags.Administrator)) {
      throw new AuthError(
        'FORBIDDEN',
        'Only a guild administrator can perform this action',
      ).asDisplayable();
    }

    await interaction.deferReply({ ephemeral: true });

    const crews = await this.crewService
      .query()
      .byGuild({ guildSf: interaction.guildId })
      .withSettings()
      .withAccessRules()
      .bySetting(CrewSettingName.CREW_PERMANENT, false)
      .getMany();

    const errors: Error[] = [];
    const result = compact(
      await Promise.all(
        crews.map(async (crew) => {
          try {
            return await this.crewService.deregisterCrew({ id: crew.id }, memberRef, {
              tag: data.tag,
              archiveSf: data.archive?.id,
            });
          } catch (err) {
            errors.push(err);
          }
        }),
      ),
    );

    if (errors.length) {
      await this.botService.replyOrFollowUp(interaction, {
        embeds: [
          new ErrorEmbed('ERROR_GENERIC').setTitle(
            `Purged ${result.length} crews. Failed to purge ${errors.length} crews.`,
          ),
        ],
      });

      for (const r of result) {
        this.logger.log(`Archived crew ${r.name} in ${r.guild.name}`);
      }

      for (const e of errors) {
        this.logger.error(`Failed to purge crew`, e.stack);
      }

      return;
    }

    await this.botService.replyOrFollowUp(interaction, {
      embeds: [new SuccessEmbed('SUCCESS_GENERIC').setTitle('Crews purged')],
    });
  }

  @Button('crew/reqapprove/:crew')
  async onCrewApproveRequest(
    @Context() [interaction]: ButtonContext,
    @ComponentParam('crew') crewRef: Snowflake,
  ) {
    // const accessArgs = await this.accessService.getTestArgs(interaction);
    // const guild = await this.guildService
    //   .query()
    //   .byGuild({ guildSf: interaction.guildId })
    //   .withAccessRules()
    //   .getOneOrFail();

    // if (
    //   new AccessDecisionBuilder()
    //     .addRule({ guildAdmin: true })
    //     .build()
    //     .deny(...accessArgs) &&
    //   guild
    //     .getAccessRulesForAction(GuildAction.CREW_MANAGE, AccessMode.ADMIN)
    //     .every((entry) => AccessDecision.fromEntry(entry.rule).deny(...accessArgs))
    // ) {
    //   throw new AuthError('FORBIDDEN', 'Forbidden');
    // }

    await this.crewService.updateCrew({ id: crewRef }, { approvedBy: interaction.user.id });
    await this.crewService.reconcileCrew({ id: crewRef });

    await this.botService.replyOrFollowUp(interaction, {
      embeds: [new SuccessEmbed('SUCCESS_GENERIC').setTitle('Crew approved')],
    });
  }

  @Button('crew/reqdelete/:crew')
  async onCrewDeleteRequest(
    @Context() [interaction]: ButtonContext,
    @ComponentParam('crew') crewRef: Snowflake,
  ) {
    const modal = new CrewDeleteModalBuilder().addForm({ id: crewRef });
    return interaction.showModal(modal);
  }

  // @Modal('crew/update/:crew')
  // async onCrewUpdate(
  //   @Context() [interaction]: ModalContext,
  //   @ModalParam('crew') channelRef: Snowflake,
  // ) {
  //   const accessArgs = await this.accessService.getTestArgs(interaction);
  //   const update = {
  //     ticketHelpText: interaction.fields.getTextInputValue('crew/ticket_help'),
  //   };
  //   const crewRef = SelectCrewDto.from(channelRef);
  //   const crew = await this.crewService.query().byCrew(crewRef).getOneOrFail();

  //   if (
  //     new AccessDecisionBuilder()
  //       .addRule({ crew: { id: crew.id }, crewRole: CrewMemberAccess.ADMIN })
  //       .addRule({ guildAdmin: true })
  //       .build()
  //       .deny(...accessArgs)
  //   ) {
  //     throw new AuthError(
  //       'FORBIDDEN',
  //       'Only crew administrators can perform this action',
  //     ).asDisplayable();
  //   }

  //   await this.crewService.updateCrew({ id: crew.id }, update);

  //   await this.botService.replyOrFollowUp(interaction, {
  //     embeds: [new SuccessEmbed('SUCCESS_GENERIC').setTitle('Crew updated')],
  //   });
  // }

  @Modal('crew/setting/:crew')
  async onCrewSetting(
    @Context() [interaction]: ModalContext,
    @ModalParam('crew') channelRef: Snowflake,
  ) {
    const memberRef = interaction.member?.user?.id ?? interaction.user?.id;
    const accessArgs = await this.accessService.getTestArgs(interaction);
    const update = interaction.fields.fields.reduce((state, current) => {
      const field = current.customId.split('/').pop();
      state[field] = current.value;
      return state;
    }, {});
    const crewRef = SelectCrewDto.from(channelRef);
    const crew = await this.crewService.query().byCrew(crewRef).getOneOrFail();

    if (
      new AccessDecisionBuilder()
        .addRule({ crew: { id: crew.id }, crewRole: CrewMemberAccess.ADMIN })
        .addRule({ guildAdmin: true })
        .build()
        .deny(...accessArgs)
    ) {
      throw new AuthError(
        'FORBIDDEN',
        'Only crew administrators can perform this action',
      ).asDisplayable();
    }

    await this.crewService.setConfig({ crewId: crew.id, updatedBy: memberRef }, update);

    await this.botService.replyOrFollowUp(interaction, {
      embeds: [new SuccessEmbed('SUCCESS_GENERIC').setTitle('Crew updated')],
    });
  }

  @Modal('crew/delete/:crew')
  async onCrewDelete(
    @Context() [interaction]: ModalContext,
    @ModalParam('crew') channelRef: Snowflake,
  ) {
    const memberRef = interaction.member?.user?.id ?? interaction.user?.id;
    const reason = interaction.fields.getTextInputValue('crew/delete/reason');
    const crewRef = SelectCrewDto.from(channelRef);

    // No access control because this is used by the audit prompt, access is controlled to the prompt itself.
    const result = await this.crewService.deregisterCrew(crewRef, memberRef);

    await this.botService.replyOrFollowUp(interaction, {
      embeds: [new SuccessEmbed('SUCCESS_GENERIC').setTitle('Crew deleted')],
    });

    const guildMember = await interaction.guild.members.fetch(memberRef);

    if (result) {
      await interaction.channel.send(
        new CrewDeletePromptBuilder().addCrewDeleteMessage(result, guildMember, reason).build(),
      );
    }
  }

  @UseInterceptors(CrewSelectAutocompleteInterceptor)
  @Subcommand({
    name: 'status',
    description: 'Display the current crew status',
    dmPermission: false,
  })
  async onCrewStatusRequest(
    @Context() [interaction]: SlashCommandContext,
    @Options() data: SelectCrewCommandParams,
  ) {
    let crew: Crew;
    const memberRef = interaction.member?.user?.id ?? interaction.user?.id;
    const crewRef = data.crew || interaction.channelId;

    crew = await this.crewService.query().byCrew({ crewSf: crewRef }).getOne();

    if (crew) {
      await this.crewService.sendIndividualStatus(
        { crewSf: crewRef },
        interaction.channelId,
        memberRef,
      );
    } else {
      await this.crewService.sendAllStatus(
        { guildSf: interaction.guildId },
        interaction.channelId,
        memberRef,
      );
    }

    await this.botService.replyOrFollowUp(interaction, {
      embeds: [new SuccessEmbed('SUCCESS_GENERIC').setTitle('Status update scheduled')],
    });
  }

  @UseInterceptors(CrewSelectAutocompleteInterceptor)
  @Subcommand({
    name: 'log',
    description: 'Post a formal update of the crew activities',
    dmPermission: false,
  })
  async onCrewLogPrompt(
    @Context() [interaction]: SlashCommandContext,
    @Options() data: SelectCrewCommandParams,
  ) {
    const accessArgs = await this.accessService.getTestArgs(interaction);
    const crew = await this.crewService
      .query()
      .byGuild({ guildSf: interaction.guildId })
      .byCrew({ crewSf: data.crew || interaction.channelId })
      .getOneOrFail();

    if (
      new AccessDecisionBuilder()
        .addRule({ guildAdmin: true })
        .addRule({ crew: { id: crew.id }, crewRole: CrewMemberAccess.ADMIN })
        .build()
        .deny(...accessArgs)
    ) {
      throw new AuthError(
        'FORBIDDEN',
        'Only a crew administrator can perform this action',
      ).asDisplayable();
    }

    const modal = new CrewLogModalBuilder().addForm(crew);
    return interaction.showModal(modal);
  }

  @Button('crew/log')
  async onCrewLogButton(@Context() [interaction]: ButtonContext) {
    const crew = await this.crewService
      .query()
      .byGuild({ guildSf: interaction.guildId })
      .byCrew({ crewSf: interaction.channelId })
      .getOneOrFail();
    const modal = new CrewLogModalBuilder().addForm(crew);
    return interaction.showModal(modal);
  }

  @Modal('crew/log/:crew')
  async onCrewLog(@Context() [interaction]: ModalContext, @ModalParam('crew') crewId: Snowflake) {
    const memberRef = interaction.member?.user?.id ?? interaction.user?.id;
    const content = interaction.fields.getTextInputValue('crew/log/content');
    const accessArgs = await this.accessService.getTestArgs(interaction);

    if (
      new AccessDecisionBuilder()
        .addRule({ guildAdmin: true })
        .addRule({ crew: { id: crewId }, crewRole: CrewMemberAccess.ADMIN })
        .build()
        .deny(...accessArgs)
    ) {
      throw new AuthError(
        'FORBIDDEN',
        'Only a crew administrator can perform this action',
      ).asDisplayable();
    }

    const result = await this.logService.addCrewLog({ id: crewId }, memberRef, { content });

    await this.botService.replyOrFollowUp(interaction, {
      embeds: [new SuccessEmbed('SUCCESS_GENERIC').setTitle('Log added')],
    });
  }

  @UseInterceptors(CrewShareAutocompleteInterceptor)
  @Subcommand({
    name: 'share',
    description: 'Allow other guilds to send tickets to this crew',
    dmPermission: false,
  })
  async onShareCrew(
    @Context() [interaction]: SlashCommandContext,
    @Options() data: ShareCrewCommandParams,
  ) {
    const memberRef = interaction.member?.user?.id ?? interaction.user?.id;
    const accessArgs = await this.accessService.getTestArgs(interaction);
    const crew = await this.crewService
      .query()
      .byGuild({ guildSf: interaction.guildId })
      .byCrew({ crewSf: data.crew || interaction.channelId })
      .withoutPending()
      .getOneOrFail();

    if (
      new AccessDecisionBuilder()
        .addRule({ guildAdmin: true })
        .addRule({ crew: { id: crew.id }, crewRole: CrewMemberAccess.ADMIN })
        .build()
        .deny(...accessArgs)
    ) {
      throw new AuthError(
        'FORBIDDEN',
        'Only a crew administrator can perform this action',
      ).asDisplayable();
    }

    const result = await this.shareService.shareCrew({
      guildId: data.guild,
      crewId: crew.id,
      createdBy: memberRef,
    });

    await this.botService.replyOrFollowUp(interaction, {
      embeds: [new SuccessEmbed('SUCCESS_GENERIC').setTitle('Crew shared')],
    });
  }

  @UseInterceptors(CrewSelectAutocompleteInterceptor)
  @Subcommand({
    name: 'prune',
    description: 'Manually trigger check to remove inactive crew members',
    dmPermission: false,
  })
  async onCrewPrune(
    @Context() [interaction]: SlashCommandContext,
    @Options() data: SelectCrewCommandParams,
  ) {
    const accessArgs = await this.accessService.getTestArgs(interaction);
    const crew = await this.crewService
      .query()
      .byGuild({ guildSf: interaction.guildId })
      .byCrew({ crewSf: data.crew || interaction.channelId })
      .withoutPending()
      .getOneOrFail();

    if (
      new AccessDecisionBuilder()
        .addRule({ guildAdmin: true })
        .addRule({ crew: { id: crew.id }, crewRole: CrewMemberAccess.ADMIN })
        .build()
        .deny(...accessArgs)
    ) {
      throw new AuthError(
        'FORBIDDEN',
        'Only a crew administrator can perform this action',
      ).asDisplayable();
    }

    await this.memberService.reconcileCrewMembership({ id: crew.id });

    await this.botService.replyOrFollowUp(interaction, {
      embeds: [new SuccessEmbed('SUCCESS_GENERIC').setTitle('Crew cleaning scheduled')],
    });
  }

  @UserCommand({
    name: 'Reconcile Crew Roles',
  })
  async onMemberReconcile(@Context() [interaction]: UserCommandContext, @TargetUser() user: User) {
    await this.memberService.reconcileIndividualMembership(
      { guildSf: interaction.guildId },
      user.id,
    );

    await this.botService.replyOrFollowUp(interaction, {
      embeds: [
        new SuccessEmbed('SUCCESS_GENERIC')
          .setTitle('Roles reconciled')
          .setDescription(
            'Incorrectly applied or missing roles should now be resolved. If any roles are missing then ask a guild administrator.',
          ),
      ],
    });
  }
}
