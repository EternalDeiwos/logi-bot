import { Injectable, Logger, UseFilters } from '@nestjs/common';
import {
  ChannelOption,
  Context,
  MentionableOption,
  Options,
  SlashCommandContext,
  SlashCommandMeta,
  Subcommand,
} from 'necord';
import { ChannelType, GuildChannel, GuildMember, Role, User } from 'discord.js';
import { EchoCommand } from 'src/core/echo.command-group';
import { SuccessEmbed } from 'src/bot/embed';
import { BotService } from 'src/bot/bot.service';
import { DiscordExceptionFilter } from 'src/bot/bot-exception.filter';
import { TeamService } from './team.service';

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

  @MentionableOption({
    name: 'role',
    description: 'Select a general access role for this team',
    required: true,
  })
  role: GuildMember | Role | User;
}

export class SelectTeamCommandParams {
  @ChannelOption({
    name: 'team',
    description: 'Select a team',
    channel_types: [ChannelType.GuildCategory],
    required: true,
  })
  category: GuildChannel;
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
    const result = await this.teamService.registerTeam({
      forum: data.forum.id,
      guild: interaction.guildId,
      category: data.category.id,
    });

    await this.botService.replyOrFollowUp(interaction, {
      embeds: [new SuccessEmbed('SUCCESS_GENERIC').setTitle('Team registered')],
    });
  }

  @Subcommand({
    name: 'delete',
    description: 'Delete a team. Guild admin only.',
    dmPermission: false,
  })
  async onDeleteTeam(
    @Context() [interaction]: SlashCommandContext,
    @Options() data: SelectTeamCommandParams,
  ) {
    const result = await this.teamService.deleteTeam({ category: data.category.id });

    await this.botService.replyOrFollowUp(interaction, {
      embeds: [new SuccessEmbed('SUCCESS_GENERIC').setTitle('Team deregistered')],
    });
  }
}
