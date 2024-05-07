import { Injectable, Logger, UseInterceptors } from '@nestjs/common';
import {
  Context,
  MemberOption,
  Options,
  SlashCommandContext,
  StringOption,
  Subcommand,
} from 'necord';
import { GuildChannelResolvable, GuildMember } from 'discord.js';
import { ConfigService } from 'src/config';
import { EchoCommand } from 'src/bot/echo.command-group';
import { TeamSelectAutocompleteInterceptor } from 'src/bot/team/team-select.interceptor';
import { CrewSelectAutocompleteInterceptor } from './crew-select.interceptor';
import { CrewMemberAccess } from './crew-member.entity';
import { CrewService } from './crew.service';

export class CreateCrewCommandParams {
  @StringOption({
    name: 'team',
    description: 'Select a team',
    autocomplete: true,
    required: true,
  })
  team: string;

  @StringOption({
    name: 'name',
    description: 'Crew name. Describe what your crew does.',
    required: true,
  })
  name: string;

  @StringOption({
    name: 'short_name',
    description: 'A short name or abbreviation for smaller UI.',
    required: false,
  })
  shortName?: string;
}

export class SelectCrewCommandParams {
  @StringOption({
    name: 'crew',
    description: 'Select a crew',
    autocomplete: true,
    required: false,
  })
  crew: string;
}

export class SelectCrewMemberCommandParams {
  @MemberOption({
    name: 'member',
    description: 'Select a crew member',
    required: true,
  })
  member: GuildMember;

  @StringOption({
    name: 'crew',
    description: 'Select a crew',
    autocomplete: true,
    required: false,
  })
  crew: string;
}

@Injectable()
@EchoCommand({
  name: 'crew',
  description: 'Manage crews',
})
export class CrewCommand {
  private readonly logger = new Logger(CrewCommand.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly crewService: CrewService,
  ) {}

  @UseInterceptors(TeamSelectAutocompleteInterceptor)
  @Subcommand({
    name: 'create',
    description: 'Create a new crew',
    dmPermission: false,
  })
  async onCreateCrew(
    @Context() [interaction]: SlashCommandContext,
    @Options() data: CreateCrewCommandParams,
  ) {
    const member = await interaction.guild.members.fetch(interaction.user);
    const result = await this.crewService.registerCrew(
      data.team,
      member,
      data.name,
      data.shortName,
    );
    await interaction.reply({ content: result.message, ephemeral: true });
  }

  @UseInterceptors(CrewSelectAutocompleteInterceptor)
  @Subcommand({
    name: 'join',
    description: 'Join a crew',
    dmPermission: false,
  })
  async onJoinCrew(
    @Context() [interaction]: SlashCommandContext,
    @Options() data: SelectCrewCommandParams,
  ) {
    const member = await interaction.guild.members.fetch(interaction.user);
    let channel: GuildChannelResolvable = interaction.channel;

    if (data.crew) {
      channel = interaction.guild.channels.cache.get(data.crew);
    }

    const result = await this.crewService.registerCrewMember(
      channel,
      member,
      CrewMemberAccess.MEMBER,
    );

    return interaction.reply({ content: result.message, ephemeral: true });
  }

  @UseInterceptors(CrewSelectAutocompleteInterceptor)
  @Subcommand({
    name: 'subscribe',
    description: 'Subscribe to team role without responsibility',
    dmPermission: false,
  })
  async onSubscribeCrew(
    @Context() [interaction]: SlashCommandContext,
    @Options() data: SelectCrewCommandParams,
  ) {
    const member = await interaction.guild.members.fetch(interaction.user);
    let channel: GuildChannelResolvable = interaction.channel;

    if (data.crew) {
      channel = interaction.guild.channels.cache.get(data.crew);
    }

    const result = await this.crewService.registerCrewMember(
      channel,
      member,
      CrewMemberAccess.SUBSCRIBED,
    );

    return interaction.reply({ content: result.message, ephemeral: true });
  }

  @UseInterceptors(CrewSelectAutocompleteInterceptor)
  @Subcommand({
    name: 'leave',
    description: 'Leave a team',
    dmPermission: false,
  })
  async onLeaveCrew(
    @Context() [interaction]: SlashCommandContext,
    @Options() data: SelectCrewCommandParams,
  ) {
    const member = await interaction.guild.members.fetch(interaction.user);

    let channel: GuildChannelResolvable = interaction.channel;

    if (data.crew) {
      channel = interaction.guild.channels.cache.get(data.crew);
    }

    const result = await this.crewService.removeCrewMember(channel, member);
    return interaction.reply({ content: result.message, ephemeral: true });
  }

  @UseInterceptors(CrewSelectAutocompleteInterceptor)
  @Subcommand({
    name: 'owner',
    description: 'Transfer ownership to another crew member. Owner only.',
    dmPermission: false,
  })
  async onSetOwner(
    @Context() [interaction]: SlashCommandContext,
    @Options() data: SelectCrewMemberCommandParams,
  ) {
    let result;
    const member = await interaction.guild.members.fetch(interaction.user);

    let channel: GuildChannelResolvable = interaction.channel;

    if (data.crew) {
      channel = interaction.guild.channels.cache.get(data.crew);
    }

    const crewMember = await this.crewService.getCrewMember(channel, member);

    if (!crewMember) {
      result = { success: false, message: 'You are not a member of this team' };
    } else if (crewMember.access > CrewMemberAccess.OWNER) {
      result = { success: false, message: 'Only the team owner can perform this action' };
    } else {
      result = await this.crewService.updateCrewMember(channel, data.member, {
        access: CrewMemberAccess.OWNER,
      });

      if (!result.success) {
        return interaction.reply({ content: result.message, ephemeral: true });
      }

      result = await this.crewService.updateCrewMember(channel, member, {
        access: CrewMemberAccess.ADMIN,
      });
    }

    return interaction.reply({ content: result.message, ephemeral: true });
  }

  @UseInterceptors(CrewSelectAutocompleteInterceptor)
  @Subcommand({
    name: 'admin',
    description: 'Give a member admin privileges. Admin only.',
    dmPermission: false,
  })
  async onSetAdmin(
    @Context() [interaction]: SlashCommandContext,
    @Options() data: SelectCrewMemberCommandParams,
  ) {
    let result;
    const member = await interaction.guild.members.fetch(interaction.user);

    let channel: GuildChannelResolvable = interaction.channel;

    if (data.crew) {
      channel = interaction.guild.channels.cache.get(data.crew);
    }

    const crewMember = await this.crewService.getCrewMember(channel, member);

    if (!crewMember) {
      result = { success: false, message: 'You are not a member of this team' };
    } else if (crewMember.access > CrewMemberAccess.ADMIN) {
      result = { success: false, message: 'Only an administrator can perform this action' };
    } else {
      result = await this.crewService.updateCrewMember(channel, data.member, {
        access: CrewMemberAccess.ADMIN,
      });
    }

    return interaction.reply({ content: result.message, ephemeral: true });
  }

  @UseInterceptors(CrewSelectAutocompleteInterceptor)
  @Subcommand({
    name: 'add',
    description: 'Add a crew member to a team. Admin only.',
    dmPermission: false,
  })
  async onAddCrewMember(
    @Context() [interaction]: SlashCommandContext,
    @Options() data: SelectCrewMemberCommandParams,
  ) {
    let result;
    const member = await interaction.guild.members.fetch(interaction.user);

    let channel: GuildChannelResolvable = interaction.channel;

    if (data.crew) {
      channel = interaction.guild.channels.cache.get(data.crew);
    }

    const crewMember = await this.crewService.getCrewMember(channel, member);

    if (!crewMember) {
      result = { success: false, message: 'You are not a member of this team' };
    } else if (crewMember.access > CrewMemberAccess.ADMIN) {
      result = { success: false, message: 'Only an administrator can perform this action' };
    } else {
      result = await this.crewService.registerCrewMember(
        channel,
        data.member,
        CrewMemberAccess.MEMBER,
      );
    }

    return interaction.reply({ content: result.message, ephemeral: true });
  }

  @UseInterceptors(CrewSelectAutocompleteInterceptor)
  @Subcommand({
    name: 'remove',
    description: 'Remove a team member from the team. Admin only.',
    dmPermission: false,
  })
  async onRemoveCrewMember(
    @Context() [interaction]: SlashCommandContext,
    @Options() data: SelectCrewMemberCommandParams,
  ) {
    let result;
    const member = await interaction.guild.members.fetch(interaction.user);
    let channel: GuildChannelResolvable = interaction.channel;

    if (data.crew) {
      channel = interaction.guild.channels.cache.get(data.crew);
    }

    const crewMember = await this.crewService.getCrewMember(channel, member);

    if (!crewMember) {
      result = { success: false, message: 'You are not a member of this team' };
    } else if (crewMember.access > CrewMemberAccess.ADMIN) {
      result = { success: false, message: 'Only an administrator can perform this action' };
    } else {
      result = await this.crewService.removeCrewMember(channel, data.member);
    }

    return interaction.reply({ content: result.message, ephemeral: true });
  }

  @UseInterceptors(CrewSelectAutocompleteInterceptor)
  @Subcommand({
    name: 'archive',
    description: 'Archive a crew',
    dmPermission: false,
  })
  async onArchiveTeam(
    @Context() [interaction]: SlashCommandContext,
    @Options() data: SelectCrewCommandParams,
  ) {
    const member = await interaction.guild.members.fetch(interaction.user);
    let channel: GuildChannelResolvable = interaction.channel;

    if (data.crew) {
      channel = interaction.guild.channels.cache.get(data.crew);
    }

    const result = await this.crewService.deregisterCrew(channel, member);

    return interaction.reply({ content: result.message, ephemeral: true });
  }
}
