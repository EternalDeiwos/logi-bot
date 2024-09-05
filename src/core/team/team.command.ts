import { Injectable, Logger, UseInterceptors } from '@nestjs/common';
import {
  ChannelOption,
  Context,
  MentionableOption,
  Options,
  SlashCommandContext,
  SlashCommandMeta,
  StringOption,
  Subcommand,
} from 'necord';
import { ChannelType, GuildChannel, GuildMember, Role, Snowflake, User } from 'discord.js';
import { EchoCommand } from 'src/core/echo.command-group';
import { ConfigService } from 'src/config';
import { TeamSelectAutocompleteInterceptor } from './team-select.interceptor';
import { TeamService } from './team.service';

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
    description: 'Select a general access role for this team',
    required: true,
  })
  role: GuildMember | Role | User;

  @ChannelOption({
    name: 'audit',
    description: 'A channel where crew control messages will be displayed.',
    channel_types: [ChannelType.GuildText],
    required: false,
  })
  audit: GuildChannel;
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

export class SetAuditTeamCommandParams {
  @StringOption({
    name: 'team',
    description: 'Select a team',
    autocomplete: true,
    required: true,
  })
  team: Snowflake;

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
    const result = await this.teamService.registerTeam(data.forum, data.role, member, data.audit);
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

  @UseInterceptors(TeamSelectAutocompleteInterceptor)
  @Subcommand({
    name: 'set_audit',
    description: 'Set the audit channel for this team',
    dmPermission: false,
  })
  async onTeamSetAuditChannel(
    @Context() [interaction]: SlashCommandContext,
    @Options() data: SetAuditTeamCommandParams,
  ) {
    const member = await interaction.guild.members.fetch(interaction.user);
    const result = await this.teamService.updateTeam(data.team, member, data.audit);
    return interaction.reply({ content: result.message, ephemeral: true });
  }
}
