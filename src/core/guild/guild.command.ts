import { Injectable, Logger, UseFilters, UseInterceptors } from '@nestjs/common';
import {
  ChannelOption,
  Context,
  Options,
  RoleOption,
  SlashCommandContext,
  StringOption,
  Subcommand,
} from 'necord';
import { QueryFailedError } from 'typeorm';
import { ChannelType, GuildChannel, PermissionsBitField, Role } from 'discord.js';
import { AuthError, ValidationError } from 'src/errors';
import { AccessMode } from 'src/types';
import { SuccessEmbed } from 'src/bot/embed';
import { BotService } from 'src/bot/bot.service';
import { DiscordExceptionFilter } from 'src/bot/bot-exception.filter';
import { EchoCommand } from 'src/core/echo.command-group';
import { AccessService } from 'src/core/access/access.service';
import { AccessDecision } from 'src/core/access/access-decision';
import { AccessDecisionBuilder } from 'src/core/access/access-decision.builder';
import { GuildService } from './guild.service';
import { GuildConfig } from './guild.entity';
import { GuildSettingName } from './guild-setting.entity';
import { GuildGrantAccessAutocompleteInterceptor } from './guild-grant-access.interceptor';
import { GuildSettingAutocompleteInterceptor } from './guild-setting.interceptor';
import { GuildAction } from './guild-access.entity';

export class EditGuildCommandParams {
  @StringOption({
    name: 'name',
    description: 'Display name for this guild',
    required: false,
  })
  name: string;

  @StringOption({
    name: 'name_short',
    description: 'A short name or acronym for tighter spaces',
    required: false,
  })
  shortName: string;
}

export class SelectGuildCommandParams {
  @StringOption({
    name: 'crew',
    description: 'Select a guild',
    autocomplete: true,
    required: true,
  })
  guild: string;
}

export class SettingTextCommandParams {
  @StringOption({
    name: 'setting',
    description: 'Select a setting',
    autocomplete: true,
    required: true,
  })
  setting: GuildSettingName;

  @StringOption({
    name: 'value',
    description: 'A value',
    required: true,
  })
  value: string;
}

export class SettingCategoryCommandParams {
  @StringOption({
    name: 'setting',
    description: 'Select a setting',
    autocomplete: true,
    required: true,
  })
  setting: GuildSettingName;

  @ChannelOption({
    name: 'category',
    description: 'A category',
    channel_types: [ChannelType.GuildCategory],
    required: true,
  })
  category: GuildChannel;
}

export class SettingRoleCommandParams {
  @StringOption({
    name: 'setting',
    description: 'Select a setting',
    autocomplete: true,
    required: true,
  })
  setting: GuildSettingName;

  @RoleOption({
    name: 'role',
    description: 'A role',
    required: true,
  })
  role: Role;
}

export class SettingChannelCommandParams {
  @StringOption({
    name: 'setting',
    description: 'Select a setting',
    autocomplete: true,
    required: true,
  })
  setting: GuildSettingName;

  @ChannelOption({
    name: 'channel',
    description: 'A channel',
    channel_types: [ChannelType.GuildText],
    required: true,
  })
  channel: GuildChannel;
}

export class GrantGuildAccessCommandParams {
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
    required: false,
  })
  access: string;
}

@Injectable()
@EchoCommand({
  name: 'guild',
  description: 'Manage guilds',
})
@UseFilters(DiscordExceptionFilter)
export class GuildCommand {
  private readonly logger = new Logger(GuildCommand.name);

  constructor(
    private readonly botService: BotService,
    private readonly guildService: GuildService,
    private readonly accessService: AccessService,
  ) {}

  @Subcommand({
    name: 'register',
    description: 'Register this guild',
    dmPermission: false,
  })
  async onGuildRegister(
    @Context() [interaction]: SlashCommandContext,
    @Options() data: EditGuildCommandParams,
  ) {
    if (!interaction.memberPermissions.has(PermissionsBitField.Flags.Administrator)) {
      throw new AuthError(
        'FORBIDDEN',
        'Only a guild administrator can perform this action',
      ).asDisplayable();
    }

    const name = data.name ?? interaction.guild.name;
    const shortName = data.shortName ?? interaction.guild.nameAcronym;
    await this.guildService.registerGuild({
      guildSf: interaction.guild.id,
      name,
      shortName,
      icon: interaction.guild.iconURL({ extension: 'png', forceStatic: true }),
    });

    await this.botService.replyOrFollowUp(interaction, {
      embeds: [new SuccessEmbed('SUCCESS_GENERIC').setTitle('Guild registered')],
    });
  }

  async setConfig<K extends keyof GuildConfig>(
    key: K,
    [interaction]: SlashCommandContext,
    value: GuildConfig[K],
  ) {
    const guild = await this.guildService
      .query()
      .byGuild({ guildSf: interaction.guildId })
      .withAccessRules()
      .getOneOrFail();

    const accessArgs = await this.accessService.getTestArgs(interaction);

    if (
      !guild.access
        .filter(
          (access) =>
            access.action === GuildAction.GUILD_SETTING_MANAGE && access.access <= AccessMode.WRITE,
        )
        .some((access) => AccessDecision.fromEntry(access.rule).permit(...accessArgs))
    ) {
      throw new AuthError('FORBIDDEN', 'You do not have access');
    }

    await this.guildService.setConfig(
      { guildId: guild.id, updatedBy: interaction.user.id },
      { [key]: value },
    );

    await this.botService.replyOrFollowUp(interaction, {
      embeds: [new SuccessEmbed('SUCCESS_GENERIC').setTitle('Configuration updated')],
    });
  }

  @UseInterceptors(GuildSettingAutocompleteInterceptor)
  @Subcommand({
    name: 'set_role',
    description: 'Update guild settings (role)',
    dmPermission: false,
  })
  async onGuildSettingRole(
    @Context() context: SlashCommandContext,
    @Options() { setting, role }: SettingRoleCommandParams,
  ) {
    if (!role) {
      throw new ValidationError('VALIDATION_FAILED', 'Invalid role').asDisplayable();
    }

    return this.setConfig(setting, context, role.id);
  }

  @UseInterceptors(GuildSettingAutocompleteInterceptor)
  @Subcommand({
    name: 'set_channel',
    description: 'Update guild settings (channel)',
    dmPermission: false,
  })
  async onGuildSettingChannel(
    @Context() context: SlashCommandContext,
    @Options() { setting, channel }: SettingChannelCommandParams,
  ) {
    if (!channel) {
      throw new ValidationError('VALIDATION_FAILED', 'Invalid channel').asDisplayable();
    }

    return this.setConfig(setting, context, channel.id);
  }

  @UseInterceptors(GuildSettingAutocompleteInterceptor)
  @Subcommand({
    name: 'set_category',
    description: 'Update guild settings (category)',
    dmPermission: false,
  })
  async onGuildSettingCategory(
    @Context() context: SlashCommandContext,
    @Options() { setting, category }: SettingCategoryCommandParams,
  ) {
    if (!category) {
      throw new ValidationError('VALIDATION_FAILED', 'Invalid category').asDisplayable();
    }

    return this.setConfig(setting, context, category.id);
  }

  @UseInterceptors(GuildSettingAutocompleteInterceptor)
  @Subcommand({
    name: 'set_text',
    description: 'Update guild settings (text)',
    dmPermission: false,
  })
  async onGuildSettingText(
    @Context() context: SlashCommandContext,
    @Options() { setting, value }: SettingTextCommandParams,
  ) {
    if (!value) {
      throw new ValidationError('VALIDATION_FAILED', 'Invalid value').asDisplayable();
    }

    return this.setConfig(setting, context, value);
  }

  @UseInterceptors(GuildGrantAccessAutocompleteInterceptor)
  @Subcommand({
    name: 'grant',
    description: 'Grant guild-level privileges to bot features',
    dmPermission: false,
  })
  async onGrantGuildAccess(
    @Context() [interaction]: SlashCommandContext,
    @Options() options: GrantGuildAccessCommandParams,
  ) {
    const guild = await this.guildService
      .query()
      .byGuild({ guildSf: interaction.guildId })
      .withAccessRules()
      .getOneOrFail();

    const accessArgs = await this.accessService.getTestArgs(interaction);

    if (
      new AccessDecisionBuilder()
        .addRule({ guildAdmin: true })
        .build()
        .deny(...accessArgs)
    ) {
      throw new AuthError('FORBIDDEN', 'Only guild admins can use this command').asDisplayable();
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

    const action = Object.entries(GuildAction).find(
      ([k, v]) => k === options.action,
    )[1] as GuildAction;

    try {
      await this.guildService.grantAccess({
        guildId: guild.id,
        ruleId: options.ruleId,
        action,
        access,
        createdBy: interaction.user.id,
      });
    } catch (err) {
      if (err instanceof QueryFailedError && err.driverError.code === '23505') {
        throw new ValidationError(
          'VALIDATION_FAILED',
          `Rule '${rule.description}' already exists for ${guild.name}`,
          [err],
        ).asDisplayable();
      }
    }

    await this.botService.replyOrFollowUp(interaction, {
      embeds: [new SuccessEmbed('SUCCESS_GENERIC').setTitle('Access granted')],
    });
  }
}
