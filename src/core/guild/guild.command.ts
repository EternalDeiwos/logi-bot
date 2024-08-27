import { Injectable, Logger, UseFilters } from '@nestjs/common';
import { ChannelType, GuildChannel } from 'discord.js';
import {
  ChannelOption,
  Context,
  Options,
  SlashCommandContext,
  StringOption,
  Subcommand,
} from 'necord';
import { DiscordExceptionFilter } from 'src/bot/bot-exception.filter';
import { EchoCommand } from 'src/core/core.command-group';
import { SuccessEmbed } from 'src/bot/embed';
import { BotService } from 'src/bot/bot.service';
import { ValidationError } from 'src/errors';
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
    name: 'guild',
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
  async onRegisterGuild(
    @Context() [interaction]: SlashCommandContext,
    @Options() data: EditGuildCommandParams,
  ) {
    const name = data.name ?? interaction.guild.name;
    const shortName = data.shortName ?? interaction.guild.nameAcronym;

    if (!name || !shortName) {
      throw new ValidationError('MALFORMED_INPUT', { name, shortName });
    }

    const { content, error } = await this.botService.request<number>(
      interaction,
      'discord',
      'discord.rpc.guild.register',
      {
        guild: {
          guildSf: interaction.guild.id,
          name,
          shortName,
          icon: interaction.guild.iconURL({ extension: 'png', forceStatic: true }),
        },
      },
    );

    if (error) {
      return this.botService.reportCommandError(interaction, error);
    }

    if (content) {
      await interaction.followUp({
        embeds: [new SuccessEmbed('SUCCESS_GENERIC').setTitle('Guild registered')],
      });
    } else {
      await interaction.followUp({
        embeds: [new SuccessEmbed('SUCCESS_GENERIC').setTitle('Guild already registered')],
      });
    }
  }

  @Subcommand({
    name: 'set_audit',
    description: 'Set the audit channel for this guild. Guild Admin only',
    dmPermission: false,
  })
  async onTeamSetAuditChannel(
    @Context() [interaction]: SlashCommandContext,
    @Options() { audit }: SetAuditChannelCommandParams,
  ) {
    if (!audit) {
      throw new ValidationError('MALFORMED_INPUT', { audit });
    }

    await this.guildService.setConfig(
      { guildSf: interaction.guildId },
      'crewAuditChannel',
      audit.id,
    );

    await interaction.reply({
      embeds: [new SuccessEmbed('SUCCESS_GENERIC').setTitle('Configuration updated')],
      ephemeral: true,
    });
  }
}
