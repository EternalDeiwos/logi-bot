import { Injectable, Logger } from '@nestjs/common';
import {
  ChannelOption,
  Context,
  MentionableOption,
  Options,
  SlashCommandContext,
  SlashCommandMeta,
  Subcommand,
} from 'necord';
import { EchoCommand } from 'src/bot/echo.command-group';
import { ConfigService } from 'src/config';
import { TeamService } from './team.service';
import { ChannelType, GuildChannel, GuildMember, Role, User } from 'discord.js';

export class CreateTeamCommandParams {
  @ChannelOption({
    name: 'forum',
    description: 'Select a forum where tickets will be created.',
    channel_types: [ChannelType.GuildForum],
    required: true,
  })
  forum: GuildChannel;

  @MentionableOption({
    name: 'role',
    description: 'Select an associated mentionable role for this team',
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
export class TeamCommand {
  private readonly logger = new Logger(TeamCommand.name);

  constructor(
    private readonly configService: ConfigService,
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
    const member = await interaction.guild.members.fetch(interaction.user);
    const result = await this.teamService.registerTeam(data.forum, data.role, member);
    return interaction.reply({ content: result.message, ephemeral: true });
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
    const member = await interaction.guild.members.fetch(interaction.user);
    const result = await this.teamService.deleteTeam(data.category, member);
    return interaction.reply({ content: result.message, ephemeral: true });
  }
}
