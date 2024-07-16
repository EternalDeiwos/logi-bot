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
  userMention,
} from 'discord.js';
import { ConfigService } from 'src/config';
import { OperationStatus } from 'src/util';
import { EchoCommand } from 'src/bot/echo.command-group';
import { TeamService } from 'src/bot/team/team.service';
import { TeamSelectAutocompleteInterceptor } from 'src/bot/team/team-select.interceptor';
import { CrewService } from './crew.service';
import { CrewRepository } from './crew.repository';
import { CrewSelectAutocompleteInterceptor } from './crew-select.interceptor';
import { CrewShareAutocompleteInterceptor } from './share/crew-share.interceptor';
import { CrewMemberAccess } from './member/crew-member.entity';
import { CrewMemberService } from './member/crew-member.service';
import { CrewMemberRepository } from './member/crew-member.repository';
import { CrewShareService } from './share/crew-share.service';
import { CrewLogService } from './log/crew-log.service';

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

export class ShareCrewCommandParams {
  @StringOption({
    name: 'guild',
    description: 'Select a guild',
    autocomplete: true,
    required: true,
  })
  guild: string;

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
    private readonly crewRepo: CrewRepository,
    private readonly crewService: CrewService,
    private readonly memberRepo: CrewMemberRepository,
    private readonly memberService: CrewMemberService,
    private readonly shareService: CrewShareService,
    private readonly logService: CrewLogService,
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
      const crewResult = await this.crewService.registerCrew(data.team, interaction.user.id, {
        name: data.name,
        shortName: data.shortName,
        movePrompt: data.movePrompt,
      });

      if (!crewResult.success) {
        return interaction.reply({ content: crewResult.message, ephemeral: true });
      }

      const result = await this.teamService.reconcileGuildForumTags(interaction.guildId);
      return interaction.reply({ content: result.message, ephemeral: true });
    } catch (err) {
      this.logger.error(`Failed to create crew: ${err.message}`, err.stack);
      return interaction.reply({
        content: `Failed to create crew. Please report this issue`,
        ephemeral: true,
      });
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
    const crew = await this.crewRepo.findOne({
      where: { channel: data.crew || interaction.channelId },
    });
    const crewMember = await this.memberRepo.findOne({
      where: { channel: data.crew || interaction.channelId, member: interaction.user.id },
    });
    const { message: content } = await this.crewService.updateCrew(crew, crewMember, {
      movePrompt: data.value,
    });

    return interaction.reply({ content, ephemeral: true });
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
    const crew = await this.crewRepo.findOne({
      where: { channel: data.crew || interaction.channelId },
    });
    const crewMember = await this.memberRepo.findOne({
      where: { channel: data.crew || interaction.channelId, member: interaction.user.id },
    });
    const { message: content } = await this.crewService.updateCrew(crew, crewMember, {
      permanent: data.value,
    });

    return interaction.reply({ content, ephemeral: true });
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
    const crew = await this.crewRepo.findOne({
      where: { channel: data.crew || interaction.channelId },
    });
    const { message: content } = await this.memberService.registerCrewMember(
      crew,
      interaction.user.id,
      CrewMemberAccess.MEMBER,
    );

    return interaction.reply({ content, ephemeral: true });
  }

  @Button('crew/join')
  async onCrewJoinRequest(@Context() [interaction]: ButtonContext) {
    const crew = await this.crewRepo.findOne({ where: { channel: interaction.channelId } });
    const { message: content } = await this.memberService.registerCrewMember(
      crew,
      interaction.user.id,
      CrewMemberAccess.MEMBER,
    );

    return interaction.reply({ content, ephemeral: true });
  }

  @UseInterceptors(CrewSelectAutocompleteInterceptor)
  @Subcommand({
    name: 'prompt',
    description:
      'Show a generic prompt to join the crew of this channel. Must be run in crew channel.',
    dmPermission: false,
  })
  async onCrewJoinPrompt(@Context() [interaction]: SlashCommandContext) {
    const crew = await this.crewRepo.findOne({ where: { channel: interaction.channelId } });
    const { message: content } = await this.crewService.crewJoinPrompt(crew);
    return interaction.reply({ content, ephemeral: true });
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
    const crew = await this.crewRepo.findOne({
      where: { channel: data.crew || interaction.channelId },
    });
    const { message: content } = await this.memberService.registerCrewMember(
      crew,
      interaction.user.id,
      CrewMemberAccess.SUBSCRIBED,
    );

    return interaction.reply({ content, ephemeral: true });
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
    const crewMember = await this.memberRepo.findOne({
      where: { channel: data.crew || interaction.channelId, member: interaction.user.id },
      relations: { crew: true },
    });
    const { message: content } = await this.memberService.removeCrewMember(crewMember);

    return interaction.reply({ content, ephemeral: true });
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
    const currentMember = await this.memberRepo.findOne({
      where: { channel: data.crew || interaction.channelId, member: interaction.user.id },
    });

    const targetMember = await this.memberRepo.findOne({
      where: { channel: data.crew || interaction.channelId, member: data.member.id },
    });

    const member = await interaction.guild.members.fetch(interaction.user);
    const { data: isAdmin, ...adminResult } = await this.memberService.isAdmin(member);

    if (!adminResult.success) {
      return adminResult;
    }

    let result;
    if (!currentMember) {
      result = { success: false, message: 'You are not a member of this team' };
    } else if (!(currentMember.requireAccess(CrewMemberAccess.OWNER), { isAdmin })) {
      result = { success: false, message: 'Only the team owner can perform this action' };
    } else if (!targetMember) {
      result = { success: false, message: `${data.member} is not a member of this team` };
    } else {
      result = await this.memberService.updateCrewMember(targetMember, {
        access: CrewMemberAccess.OWNER,
      });

      if (!result.success) {
        return interaction.reply({ content: result.message, ephemeral: true });
      }

      result = await this.memberService.updateCrewMember(currentMember, {
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
    const crewMember = await this.memberRepo.findOne({
      where: { channel: data.crew || interaction.channelId, member: interaction.user.id },
    });

    const member = await interaction.guild.members.fetch(interaction.user);
    const { data: isAdmin, ...adminResult } = await this.memberService.isAdmin(member);

    if (!adminResult.success) {
      return adminResult;
    }

    let result;
    if (!crewMember) {
      result = new OperationStatus({
        success: false,
        message: 'You are not a member of this team',
      });
    } else if (!crewMember.requireAccess(CrewMemberAccess.ADMIN, { isAdmin })) {
      result = new OperationStatus({
        success: false,
        message: 'Only an administrator can perform this action',
      });
    } else {
      result = await this.memberService.updateCrewMember(crewMember, {
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
    const crewMember = await this.memberRepo.findOne({
      where: { channel: data.crew || interaction.channelId, member: interaction.user.id },
    });

    const member = await interaction.guild.members.fetch(interaction.user);
    const { data: isAdmin, ...adminResult } = await this.memberService.isAdmin(member);

    if (!adminResult.success) {
      return adminResult;
    }

    let result;
    if (!crewMember) {
      result = new OperationStatus({
        success: false,
        message: 'You are not a member of this team',
      });
    } else if (!crewMember.requireAccess(CrewMemberAccess.ADMIN, { isAdmin })) {
      result = new OperationStatus({
        success: false,
        message: 'Only an administrator can perform this action',
      });
    } else {
      result = await this.memberService.registerCrewMember(
        crewMember.crew,
        data.member.id,
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
    const crewMember = await this.memberRepo.findOne({
      where: { channel: data.crew || interaction.channelId, member: interaction.user.id },
    });

    const targetMember = await this.memberRepo.findOne({
      where: { channel: data.crew || interaction.channelId, member: data.member.id },
    });

    const member = await interaction.guild.members.fetch(interaction.user);
    const { data: isAdmin, ...adminResult } = await this.memberService.isAdmin(member);

    if (!adminResult.success) {
      return adminResult;
    }

    let result;
    if (!crewMember) {
      result = new OperationStatus({
        success: false,
        message: 'You are not a member of this team',
      });
    } else if (!crewMember.requireAccess(CrewMemberAccess.ADMIN, { isAdmin })) {
      result = new OperationStatus({
        success: false,
        message: 'Only an administrator can perform this action',
      });
    } else if (!targetMember) {
      result = new OperationStatus({ success: true, message: 'Done' });
    } else {
      result = await this.memberService.removeCrewMember(targetMember);
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
    const { data: isAdmin, ...adminResult } = await this.memberService.isAdmin(member);

    if (!adminResult.success) {
      return adminResult;
    }

    const { message: content } = await this.crewService.deregisterCrew(
      data.crew || interaction.channelId,
      interaction.user.id,
      { isAdmin, archiveTag: data.tag, archiveTargetRef: data.archive?.id, softDelete: true },
    );

    return interaction.reply({ content, ephemeral: true });
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
    await interaction.deferReply({ ephemeral: true });
    const member = await interaction.guild.members.fetch(interaction.user);
    const { data: isAdmin, ...adminResult } = await this.memberService.isAdmin(member);

    if (!adminResult.success) {
      return adminResult;
    }

    const crews = await this.crewRepo.find({
      where: { guild: interaction.guildId, permanent: false },
    });

    const result = OperationStatus.collect(
      await Promise.all(
        crews.map((crew) =>
          this.crewService.deregisterCrew(crew.channel, interaction.user.id, {
            isAdmin,
            softDelete: true,
            archiveTag: data.tag,
            archiveTargetRef: data.archive?.id,
          }),
        ),
      ),
    );

    if (!result.success) {
      for (const message of result.data) {
        this.logger.error(message);
      }
    }

    return interaction.editReply({ content: result.message });
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
    const reason = interaction.fields.getTextInputValue('crew/delete/reason');

    const { data: member, ...memberResult } = await this.memberService.resolveGuildMember(
      interaction.user.id,
      crewRef,
    );

    if (!memberResult.success) {
      return memberResult;
    }

    const result = await this.crewService.deregisterCrew(crewRef, interaction.user.id, {
      skipAccessControl: true,
    });
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

  @UseInterceptors(CrewSelectAutocompleteInterceptor)
  @Subcommand({
    name: 'status',
    description: 'Display the current crew status',
    dmPermission: false,
  })
  async onCrewStatusRequest(
    @Context() [interaction]: SlashCommandContext,
    @Options() data: SelectCrewCommandParams,
  ) {
    const member = await interaction.guild.members.fetch(interaction.user);
    let result;

    // Use specified crew
    if (data.crew) {
      const crew = await this.crewRepo.findOne({ where: { channel: data.crew } });
      result = await this.crewService.sendIndividualStatus(interaction.channel, member, crew);

      // Try infer crew from current channel
    } else {
      const maybeCrew = await this.crewRepo.findOne({ where: { channel: interaction.channelId } });
      if (maybeCrew) {
        result = await this.crewService.sendIndividualStatus(
          interaction.channel,
          member,
          maybeCrew,
        );

        // Send status for all crews
      } else {
        result = await this.crewService.sendAllStatus(interaction.channel, member);
      }
    }
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
    const modal = this.buildLogModal(data.crew || interaction.channelId);
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
    const content = interaction.fields.getTextInputValue('crew/log/content');
    const result = await this.logService.addCrewLog(crewRef, interaction.user.id, { content });
    await interaction.reply({ content: result.message, ephemeral: true });
  }

  @UseInterceptors(CrewShareAutocompleteInterceptor)
  @Subcommand({
    name: 'share',
    description: 'Allow other guilds to send tickets to this crew',
    dmPermission: false,
  })
  async onShareCrew(
    @Context() [interaction]: SlashCommandContext,
    @Options() data: ShareCrewCommandParams,
  ) {
    const member = await interaction.guild.members.fetch(interaction.user);
    const { data: isAdmin, ...adminResult } = await this.memberService.isAdmin(member);

    if (!adminResult.success) {
      return adminResult;
    }

    const { message: content } = await this.shareService.shareCrew(
      data.guild,
      data.crew || interaction.channelId,
      interaction.user.id,
      { isAdmin },
    );

    return interaction.reply({ content, ephemeral: true });
  }
}
