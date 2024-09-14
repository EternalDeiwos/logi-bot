import { Injectable, Logger, UseFilters, UseInterceptors } from '@nestjs/common';
import {
  ChannelOption,
  Context,
  Options,
  SlashCommandContext,
  SlashCommandMeta,
  StringOption,
  Subcommand,
} from 'necord';
import { ChannelType, GuildChannel, PermissionsBitField } from 'discord.js';
import { AuthError } from 'src/errors';
import { EchoCommand } from 'src/core/echo.command-group';
import { SuccessEmbed } from 'src/bot/embed';
import { BotService } from 'src/bot/bot.service';
import { DiscordExceptionFilter } from 'src/bot/bot-exception.filter';
import { GuildService } from 'src/core/guild/guild.service';
import { TeamService } from './team.service';
import { TeamSelectAutocompleteInterceptor } from './team-select.interceptor';

export class CreateTeamCommandParams {
  @ChannelOption({
    name: 'category',
    description: 'Select a category',
    channel_types: [ChannelType.GuildCategory],
    required: true,
  })
  category: GuildChannel;

  @ChannelOption({
    name: 'forum',
    description: 'Select a forum where tickets will be created.',
    channel_types: [ChannelType.GuildForum],
    required: true,
  })
  forum: GuildChannel;
}

export class SelectTeamCommandParams {
  @StringOption({
    name: 'team',
    description: 'Select a team',
    autocomplete: true,
    required: true,
  })
  teamId: string;
}

@Injectable()
@EchoCommand({
  name: 'team',
  description: 'Manage teams',
})
@UseFilters(DiscordExceptionFilter)
export class TeamCommand {
  private readonly logger = new Logger(TeamCommand.name);

  constructor(
    private readonly botService: BotService,
    private readonly guildService: GuildService,
    private readonly teamService: TeamService,
  ) {}

  @Subcommand({
    name: 'add',
    description: 'Register team information. Guild admin only.',
    dmPermission: false,
    defaultMemberPermissions: '0',
  } as SlashCommandMeta)
  async onCreateTeam(
    @Context() [interaction]: SlashCommandContext,
    @Options() data: CreateTeamCommandParams,
  ) {
    if (!interaction.memberPermissions.has(PermissionsBitField.Flags.Administrator)) {
      throw new AuthError(
        'FORBIDDEN',
        'Only a guild administrator can perform this action',
      ).asDisplayable();
    }

    const guild = await this.guildService.getGuild({ guildSf: interaction.guildId });
    const result = await this.teamService.registerTeam({
      forumSf: data.forum.id,
      guildId: guild.id,
      categorySf: data.category.id,
      name: data.category.name,
    });

    await this.botService.replyOrFollowUp(interaction, {
      embeds: [new SuccessEmbed('SUCCESS_GENERIC').setTitle('Team registered')],
    });
  }

  @UseInterceptors(TeamSelectAutocompleteInterceptor)
  @Subcommand({
    name: 'delete',
    description: 'Delete a team. Guild admin only.',
    dmPermission: false,
  })
  async onDeleteTeam(
    @Context() [interaction]: SlashCommandContext,
    @Options() data: SelectTeamCommandParams,
  ) {
    if (!interaction.memberPermissions.has(PermissionsBitField.Flags.Administrator)) {
      throw new AuthError(
        'FORBIDDEN',
        'Only a guild administrator can perform this action',
      ).asDisplayable();
    }

    const result = await this.teamService.deleteTeam({ id: data.teamId });

    await this.botService.replyOrFollowUp(interaction, {
      embeds: [new SuccessEmbed('SUCCESS_GENERIC').setTitle('Team deregistered')],
    });
  }
}
