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
import { ChannelType, GuildChannel, PermissionsBitField, Role } from 'discord.js';
import { AuthError, ValidationError } from 'src/errors';
import { SuccessEmbed } from 'src/bot/embed';
import { BotService } from 'src/bot/bot.service';
import { EchoCommand } from 'src/core/echo.command-group';
import { DiscordExceptionFilter } from 'src/bot/bot-exception.filter';
import { CrewSelectAutocompleteInterceptor } from 'src/core/crew/crew-select.interceptor';
import { SelectCrewCommandParams } from 'src/core/crew/crew.command';
import { GuildService } from './guild.service';
import { GuildConfig } from './guild.entity';

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

export class SetCategoryCommandParams {
  @ChannelOption({
    name: 'category',
    description: 'A category to place new channels',
    channel_types: [ChannelType.GuildCategory],
    required: true,
  })
  category: GuildChannel;
}

export class SetRoleCommandParams {
  @RoleOption({
    name: 'role',
    description: 'A role to be granted access',
    required: true,
  })
  role: Role;
}

export class SetLogChannelCommandParams {
  @ChannelOption({
    name: 'log',
    description: 'A channel where all log messages will be displayed.',
    channel_types: [ChannelType.GuildText],
    required: true,
  })
  log: GuildChannel;
}

export class SetAuditChannelCommandParams {
  @ChannelOption({
    name: 'audit',
    description: 'A channel where crew control messages will be displayed.',
    channel_types: [ChannelType.GuildText],
    required: true,
  })
  audit: GuildChannel;
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
    if (!interaction.memberPermissions.has(PermissionsBitField.Flags.Administrator)) {
      throw new AuthError(
        'FORBIDDEN',
        'Only a guild administrator can perform this action',
      ).asDisplayable();
    }

    await this.guildService.setConfig({ guildSf: interaction.guildId }, key, value);

    await this.botService.replyOrFollowUp(interaction, {
      embeds: [new SuccessEmbed('SUCCESS_GENERIC').setTitle('Configuration updated')],
    });
  }

  @Subcommand({
    name: 'set_crew_leader_role',
    description: 'Specify a role to be assigned to crew owners. Guild Admin only',
    dmPermission: false,
  })
  async onGuildSetCrewLeaderRole(
    @Context() context: SlashCommandContext,
    @Options() { role }: SetRoleCommandParams,
  ) {
    if (!role) {
      throw new ValidationError('VALIDATION_FAILED', 'Invalid role').asDisplayable();
    }

    return this.setConfig('crewLeaderRole', context, role.id);
  }

  @Subcommand({
    name: 'set_crew_creator',
    description: 'Set the role who can create crews. Guild Admin only',
    dmPermission: false,
  })
  async onGuildSetCrewCreatorRole(
    @Context() context: SlashCommandContext,
    @Options() { role }: SetRoleCommandParams,
  ) {
    if (!role) {
      throw new ValidationError('VALIDATION_FAILED', 'Invalid role').asDisplayable();
    }

    return this.setConfig('crewCreatorRole', context, role.id);
  }

  @Subcommand({
    name: 'set_crew_viewer',
    description: 'Set the role to be given access to new crews. Guild Admin only',
    dmPermission: false,
  })
  async onGuildSetCrewViewerRole(
    @Context() context: SlashCommandContext,
    @Options() { role }: SetRoleCommandParams,
  ) {
    if (!role) {
      throw new ValidationError('VALIDATION_FAILED', 'Invalid role').asDisplayable();
    }

    return this.setConfig('crewViewerRole', context, role.id);
  }

  @Subcommand({
    name: 'set_log',
    description: 'Set the global log channel for this guild. Guild Admin only',
    dmPermission: false,
  })
  async onGuildSetLogChannel(
    @Context() context: SlashCommandContext,
    @Options() { log }: SetLogChannelCommandParams,
  ) {
    if (!log) {
      throw new ValidationError('VALIDATION_FAILED', 'Log channel not provided');
    }

    return this.setConfig('globalLogChannel', context, log.id);
  }

  @Subcommand({
    name: 'set_audit',
    description: 'Set the audit channel for this guild. Guild Admin only',
    dmPermission: false,
  })
  async onGuildSetAuditChannel(
    @Context() context: SlashCommandContext,
    @Options() { audit }: SetAuditChannelCommandParams,
  ) {
    if (!audit) {
      throw new ValidationError('VALIDATION_FAILED', 'Audit channel not provided');
    }

    return this.setConfig('crewAuditChannel', context, audit.id);
  }

  @Subcommand({
    name: 'set_voice_category',
    description: 'Set the category where voice channels will be created. Guild Admin only',
    dmPermission: false,
  })
  async onGuildSetVoiceCategory(
    @Context() context: SlashCommandContext,
    @Options() { category }: SetCategoryCommandParams,
  ) {
    if (!category) {
      throw new ValidationError('VALIDATION_FAILED', 'Category not provided');
    }

    return this.setConfig('globalVoiceCategory', context, category.id);
  }
}
