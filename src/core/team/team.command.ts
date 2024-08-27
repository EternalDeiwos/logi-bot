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
import { ChannelType, GuildChannel, Role } from 'discord.js';
import { EchoCommand } from 'src/core/core.command-group';
import { DiscordExceptionFilter } from 'src/bot/bot-exception.filter';
import { BotService } from 'src/bot/bot.service';
import { SuccessEmbed } from 'src/bot/embed';
import { ValidationError } from 'src/errors';
import { TeamSelectAutocompleteInterceptor } from './team-select.interceptor';

export class CreateTeamCommandParams {
  @ChannelOption({
    name: 'category',
    description: 'Select a category where crews will be created.',
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

  @RoleOption({
    name: 'role',
    description: 'Select a general access role for this team',
    required: true,
  })
  role: Role;

  @StringOption({
    name: 'name',
    description: 'Name of the team.',
    required: false,
  })
  name: string;
}

export class SelectTeamCommandParams {
  @StringOption({
    name: 'team',
    description: 'Select a team',
    required: true,
    autocomplete: true,
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

  constructor(private readonly botService: BotService) {}

  @Subcommand({
    name: 'register',
    description: 'Register team information. Guild admin only.',
    dmPermission: false,
  })
  async onRegisterTeam(
    @Context() [interaction]: SlashCommandContext,
    @Options() { name, category, forum, role }: CreateTeamCommandParams,
  ) {
    if (!category || !forum || !role) {
      throw new ValidationError('MALFORMED_INPUT', {
        name,
        category: category.toJSON(),
        forum: forum.toJSON(),
        role: role.toJSON(),
      });
    }

    if (!name) {
      name = category.name;
    }

    const { content, error } = await this.botService.request<number>(
      interaction,
      'discord',
      'discord.rpc.team.register',
      {
        team: {
          name,
          categorySf: category.id,
          forumSf: forum.id,
          roleSf: role.id,
        },
      },
    );

    if (error) {
      return this.botService.reportCommandError(interaction, error);
    }

    if (content) {
      await interaction.followUp({
        embeds: [new SuccessEmbed('SUCCESS_GENERIC').setTitle('Team registered')],
      });
    }
  }

  @UseInterceptors(TeamSelectAutocompleteInterceptor)
  @Subcommand({
    name: 'delete',
    description: 'Delete a team. Guild admin only.',
    dmPermission: false,
  })
  async onDeleteTeam(
    @Context() [interaction]: SlashCommandContext,
    @Options() { teamId }: SelectTeamCommandParams,
  ) {
    if (!teamId) {
      throw new ValidationError('MALFORMED_INPUT', {
        teamId,
      });
    }

    const { content, error } = await this.botService.request<number>(
      interaction,
      'discord',
      'discord.rpc.team.deregister',
      {
        team: {
          id: teamId,
        },
      },
    );

    if (error) {
      return this.botService.reportCommandError(interaction, error);
    }

    if (content) {
      await interaction.followUp({
        embeds: [new SuccessEmbed('SUCCESS_GENERIC').setTitle('Team registered')],
      });
    }
  }
}
