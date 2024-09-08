import { Injectable, Logger, UseFilters } from '@nestjs/common';
import {
  ChannelOption,
  Context,
  Options,
  SlashCommandContext,
  StringOption,
  Subcommand,
} from 'necord';
import { ChannelType, GuildChannel, PermissionsBitField } from 'discord.js';
import { AuthError, ValidationError } from 'src/errors';
import { SuccessEmbed } from 'src/bot/embed';
import { BotService } from 'src/bot/bot.service';
import { EchoCommand } from 'src/core/echo.command-group';
import { DiscordExceptionFilter } from 'src/bot/bot-exception.filter';
import { GuildService } from './guild.service';

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
  async onCreateCrew(
    @Context() [interaction]: SlashCommandContext,
    @Options() data: EditGuildCommandParams,
  ) {
    const name = data.name ?? interaction.guild.name;
    const shortName = data.shortName ?? interaction.guild.nameAcronym;
    await this.guildService.registerGuild({
      guild: interaction.guild.id,
      name,
      shortName,
      icon: interaction.guild.iconURL({ extension: 'png', forceStatic: true }),
    });

    await this.botService.replyOrFollowUp(interaction, {
      embeds: [new SuccessEmbed('SUCCESS_GENERIC').setTitle('Guild registered')],
    });
  }

  @Subcommand({
    name: 'set_audit',
    description: 'Set the audit channel for this guild. Guild Admin only',
    dmPermission: false,
  })
  async onGuildSetAuditChannel(
    @Context() [interaction]: SlashCommandContext,
    @Options() { audit }: SetAuditChannelCommandParams,
  ) {
    if (!interaction.memberPermissions.has(PermissionsBitField.Flags.Administrator)) {
      throw new AuthError('FORBIDDEN', 'Only guild admins may register the guild');
    }

    if (!audit) {
      throw new ValidationError('VALIDATION_FAILED', 'Audit channel not provided');
    }

    await this.guildService.setConfig({ guild: interaction.guildId }, 'crewAuditChannel', audit.id);

    await interaction.reply({
      embeds: [new SuccessEmbed('SUCCESS_GENERIC').setTitle('Configuration updated')],
      ephemeral: true,
    });
  }
}
