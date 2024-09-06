import { Injectable, Logger, UseFilters } from '@nestjs/common';
import { Context, Options, SlashCommandContext, StringOption, Subcommand } from 'necord';
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

@Injectable()
@EchoCommand({
  name: 'guild',
  description: 'Manage guilds',
})
@UseFilters(DiscordExceptionFilter)
export class GuildCommand {
  private readonly logger = new Logger(GuildCommand.name);

  constructor(private readonly guildService: GuildService) {}

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
    return interaction.reply({ content: 'Done', ephemeral: true });
  }
}
