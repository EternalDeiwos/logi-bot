import { Injectable, Logger, UseInterceptors } from '@nestjs/common';
import {
  BooleanOption,
  Button,
  ButtonContext,
  ChannelOption,
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
  ChannelType,
  EmbedBuilder,
  GuildChannel,
  GuildChannelResolvable,
  GuildMember,
  ModalBuilder,
  Snowflake,
  TextInputBuilder,
  TextInputStyle,
} from 'discord.js';
import { ConfigService } from 'src/config';
import { EchoCommand } from 'src/bot/echo.command-group';
import { TeamService } from 'src/bot/team/team.service';
import { TeamSelectAutocompleteInterceptor } from 'src/bot/team/team-select.interceptor';
import { CrewSelectAutocompleteInterceptor } from './crew-select.interceptor';
import { CrewMemberAccess } from './crew-member.entity';
import { CrewService } from './crew.service';
import { collectResults } from 'src/util';

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

export class ArchiveCrewCommandParams {
  @StringOption({
    name: 'crew',
    description: 'Select a crew',
    autocomplete: true,
    required: false,
  })
  crew: string;

  @ChannelOption({
    name: 'archive',
    description:
      'Category where the crew should be archived. Crew will be deleted if not provided.',
    channel_types: [ChannelType.GuildCategory],
    required: false,
  })
  archive: GuildChannel;

  @StringOption({
    name: 'tag',
    description: 'Suffix for archived channels. Useful for keeping track of all archived channels.',
    required: false,
  })
  tag: string;
}

export class PurgeCrewsCommandParams {
  @ChannelOption({
    name: 'archive',
    description:
      'Category where the crew should be archived. Crew will be deleted if not provided.',
    channel_types: [ChannelType.GuildCategory],
    required: false,
  })
  archive: GuildChannel;

  @StringOption({
    name: 'tag',
    description: 'Suffix for archived channels. Useful for keeping track of all archived channels.',
    required: false,
  })
  tag: string;
}

export class SetFlagCommandParams {
  @BooleanOption({
    name: 'flag',
    description: 'Set flag enabled or disabled for this crew',
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
    try {
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
    } catch (err) {
      this.logger.error(`Failed to create crew: ${err.message}`, err.stack);
      return interaction.reply({ content: `Failed to create crew. Please report this issue` });
    }
  }

  @UseInterceptors(CrewSelectAutocompleteInterceptor)
  @Subcommand({
    name: 'enable_move',
    description: 'Enable or disable the movement interface',
    dmPermission: false,
  })
  async onSetMovePrompt(
    @Context() [interaction]: SlashCommandContext,
    @Options() data: SetFlagCommandParams,
  ) {
    const member = await interaction.guild.members.fetch(interaction.user);
    let channel: GuildChannelResolvable = interaction.channel;

    if (data.crew) {
      channel = interaction.guild.channels.cache.get(data.crew);
    }

    const result = await this.crewService.updateCrew(channel, member, { movePrompt: data.value });

    return interaction.reply({ content: result.message, ephemeral: true });
  }

  @UseInterceptors(CrewSelectAutocompleteInterceptor)
  @Subcommand({
    name: 'set_permanent',
    description: 'Disables archiving a crew during a purge',
    dmPermission: false,
  })
  async onSetPermanentPrompt(
    @Context() [interaction]: SlashCommandContext,
    @Options() data: SetFlagCommandParams,
  ) {
    const member = await interaction.guild.members.fetch(interaction.user);
    let channel: GuildChannelResolvable = interaction.channel;

    if (data.crew) {
      channel = interaction.guild.channels.cache.get(data.crew);
    }

    const result = await this.crewService.updateCrew(channel, member, { permanent: data.value });

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
    const member = await interaction.guild.members.fetch(crew.createdBy);
    await this.crewService.crewJoinPrompt(channel, crew, member);
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
  async onArchiveCrew(
    @Context() [interaction]: SlashCommandContext,
    @Options() data: ArchiveCrewCommandParams,
  ) {
    const member = await interaction.guild.members.fetch(interaction.user);
    let channel: GuildChannelResolvable = interaction.channel;

    if (data.crew) {
      channel = interaction.guild.channels.cache.get(data.crew);
    }

    let force = false;
    if (member.permissions.has('Administrator')) {
      force = true;
    }

    const result = await this.crewService.deregisterCrew(
      channel,
      member,
      force,
      data.archive?.id,
      data.tag,
    );

    return interaction.reply({ content: result.message, ephemeral: true });
  }

  @Subcommand({
    name: 'purge',
    description: 'Archives all crews',
    dmPermission: false,
  })
  async onPurgeCrews(
    @Context() [interaction]: SlashCommandContext,
    @Options() data: PurgeCrewsCommandParams,
  ) {
    const member = await interaction.guild.members.fetch(interaction.user);
    const crews = await this.crewService.getCrews(interaction.guild);

    let force = false;
    if (member.permissions.has('Administrator')) {
      force = true;
    }

    const results = await Promise.all(
      crews.map(async (crew) => {
        if (crew.permanent) {
          return { success: true, message: 'Done' };
        }

        return this.crewService.deregisterCrew(
          crew.channel,
          member,
          force,
          data.archive?.id,
          data.tag,
        );
      }),
    );

    const result = collectResults(results);

    return interaction.reply({ content: result.message, ephemeral: true });
  }

  @Button('crew/reqdelete/:crew')
  async onCrewDeleteRequest(
    @Context() [interaction]: ButtonContext,
    @ComponentParam('crew') crewRef: Snowflake,
  ) {
    const modal = this.buildDeclineModal(crewRef);
    return interaction.showModal(modal);
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

  @Subcommand({
    name: 'status',
    description: 'Display the current crew status',
    dmPermission: false,
  })
  async onCrewStatusRequest(@Context() [interaction]: SlashCommandContext) {
    const member = await interaction.guild.members.fetch(interaction.user);
    const result = await this.crewService.sendStatus(interaction.channel, member);
    return interaction.reply({ content: result.message, ephemeral: true });
  }

  @UseInterceptors(CrewSelectAutocompleteInterceptor)
  @Subcommand({
    name: 'log',
    description: 'Post a formal update of the crew activities',
    dmPermission: false,
  })
  async onCrewLogPrompt(
    @Context() [interaction]: SlashCommandContext,
    @Options() data: SelectCrewCommandParams,
  ) {
    let channel: GuildChannelResolvable = interaction.channel;

    if (data.crew) {
      channel = await interaction.guild.channels.fetch(data.crew);
    }

    const modal = this.buildLogModal(channel.id);
    return interaction.showModal(modal);
  }

  buildLogModal(channelRef: GuildChannelResolvable) {
    const log = new TextInputBuilder()
      .setCustomId('crew/log/content')
      .setLabel('Crew Status')
      .setPlaceholder(
        'This will replace the last log on status updates so please keep it relevant.',
      )
      .setStyle(TextInputStyle.Paragraph);

    return new ModalBuilder()
      .setCustomId(`crew/log/${channelRef}`)
      .setTitle('New Crew Log')
      .addComponents(new ActionRowBuilder<TextInputBuilder>().addComponents(log));
  }

  @Button('crew/log')
  async onCrewLogButton(@Context() [interaction]: ButtonContext) {
    const modal = this.buildLogModal(interaction.channel.id);
    return interaction.showModal(modal);
  }

  @Modal('crew/log/:crew')
  async onCrewLog(@Context() [interaction]: ModalContext, @ModalParam('crew') crewRef: Snowflake) {
    const guild = interaction.guild;
    const member = await guild.members.fetch(interaction.user);
    const content = interaction.fields.getTextInputValue('crew/log/content');
    const result = await this.crewService.addCrewLog(crewRef, member, content);
    await interaction.reply({ content: result.message, ephemeral: true });
  }
}
