import { Injectable, Logger, UseInterceptors } from '@nestjs/common';
import {
  BooleanOption,
  Button,
  ButtonContext,
  ComponentParam,
  Context,
  MemberOption,
  Modal,
  ModalContext,
  ModalParam,
  Options,
  SlashCommandContext,
  StringOption,
  Subcommand,
} from 'necord';
import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  GuildChannelResolvable,
  GuildMember,
  ModalBuilder,
  Snowflake,
  TextInputBuilder,
  TextInputStyle,
  channelMention,
} from 'discord.js';
import { ConfigService } from 'src/config';
import { EchoCommand } from 'src/bot/echo.command-group';
import { TeamService } from 'src/bot/team/team.service';
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

  @BooleanOption({
    name: 'move_prompt',
    description: 'Should the ticket move prompt appear on every ticket?',
    required: false,
  })
  movePrompt: boolean = false;
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

export class SetTriageCommandParams {
  @BooleanOption({
    name: 'enable_triage',
    description: 'Set triage prompt enabled or disabled for this crew',
    required: true,
  })
  value: boolean;

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
    private readonly teamService: TeamService,
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
    const crewResult = await this.crewService.registerCrew(
      data.team,
      member,
      data.name,
      data.shortName,
      data.movePrompt,
    );

    if (!crewResult.success) {
      return interaction.reply({ content: crewResult.message, ephemeral: true });
    }

    const result = await this.teamService.reconcileGuildForumTags(member.guild);
    return interaction.reply({ content: result.message, ephemeral: true });
  }

  @UseInterceptors(CrewSelectAutocompleteInterceptor)
  @Subcommand({
    name: 'enable_move',
    description: 'Enable or disable the movement interface',
    dmPermission: false,
  })
  async onSetMovePrompt(
    @Context() [interaction]: SlashCommandContext,
    @Options() data: SetTriageCommandParams,
  ) {
    const member = await interaction.guild.members.fetch(interaction.user);
    let channel: GuildChannelResolvable = interaction.channel;

    if (data.crew) {
      channel = interaction.guild.channels.cache.get(data.crew);
    }

    const result = await this.crewService.updateCrew(channel, member, data.value);

    return interaction.reply({ content: result.message, ephemeral: true });
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

  @Button('crew/join')
  async onCrewJoinRequest(@Context() [interaction]: ButtonContext) {
    const member = await interaction.guild.members.fetch(interaction.user);
    let channel: GuildChannelResolvable = interaction.channel;

    const result = await this.crewService.registerCrewMember(
      channel,
      member,
      CrewMemberAccess.MEMBER,
    );

    return interaction.reply({ content: result.message, ephemeral: true });
  }

  @UseInterceptors(CrewSelectAutocompleteInterceptor)
  @Subcommand({
    name: 'prompt',
    description:
      'Show a generic prompt to join the crew of this channel. Must be run in crew channel.',
    dmPermission: false,
  })
  async onCrewJoinPrompt(@Context() [interaction]: SlashCommandContext) {
    let channel = interaction.channel;
    const crew = await this.crewService.getCrew(channel);
    await this.crewService.crewJoinPrompt(channel, crew);
    return interaction.reply({ content: 'Done', ephemeral: true });
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

  @Button('crew/reqdelete/:crew')
  async onCrewDeleteRequest(
    @Context() [interaction]: ButtonContext,
    @ComponentParam('crew') crewRef: Snowflake,
  ) {
    const modal = this.buildDeclineModal(crewRef);
    interaction.showModal(modal);
  }

  buildDeclineModal(crewRef: GuildChannelResolvable) {
    const reason = new TextInputBuilder()
      .setCustomId('crew/delete/reason')
      .setLabel('Reason')
      .setStyle(TextInputStyle.Paragraph);

    return new ModalBuilder()
      .setCustomId(`crew/delete/${crewRef}`)
      .setTitle('Delete Crew')
      .addComponents(new ActionRowBuilder<TextInputBuilder>().addComponents(reason));
  }

  @Modal('crew/delete/:crew')
  async onCrewDelete(
    @Context() [interaction]: ModalContext,
    @ModalParam('crew') crewRef: Snowflake,
  ) {
    const guild = interaction.guild;
    const member = await guild.members.fetch(interaction.user);
    const reason = interaction.fields.getTextInputValue('crew/delete/reason');
    const result = await this.crewService.deregisterCrew(crewRef, member, true);
    await interaction.reply({ content: result.message, ephemeral: true });

    if (result.success) {
      const message = reason
        .split('\n')
        .map((r) => `> ${r}`)
        .join('\n');

      const embed = new EmbedBuilder()
        .setTitle('Crew Removed')
        .setColor('DarkRed')
        .setDescription(
          `Crew **${result.data}** was removed by ${member} for the following reason:\n\n${message}`,
        )
        .setThumbnail(member.avatarURL() ?? member.user.avatarURL());

      await interaction.channel.send({
        embeds: [embed],
      });
    }
  }
}
