import { Injectable, Logger, UseFilters, UseInterceptors } from '@nestjs/common';
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
  ChannelType,
  GuildChannel,
  GuildManager,
  GuildMember,
  PermissionsBitField,
  Snowflake,
} from 'discord.js';
import { Equal, Not } from 'typeorm';
import { compact } from 'lodash';
import { AuthError, DatabaseError, ValidationError } from 'src/errors';
import { CrewMemberAccess } from 'src/types';
import { ErrorEmbed, SuccessEmbed } from 'src/bot/embed';
import { EchoCommand } from 'src/core/echo.command-group';
import { BotService } from 'src/bot/bot.service';
import { DiscordService } from 'src/bot/discord.service';
import { DiscordExceptionFilter } from 'src/bot/bot-exception.filter';
import { GuildService } from 'src/core/guild/guild.service';
import { TeamService } from 'src/core/team/team.service';
import { TeamSelectAutocompleteInterceptor } from 'src/core/team/team-select.interceptor';
import { CrewService } from './crew.service';
import { CrewRepository } from './crew.repository';
import { CrewSelectAutocompleteInterceptor } from './crew-select.interceptor';
import { CrewShareAutocompleteInterceptor } from './share/crew-share.interceptor';
import { CrewMemberService } from './member/crew-member.service';
import { CrewMemberRepository } from './member/crew-member.repository';
import { CrewShareService } from './share/crew-share.service';
import { CrewLogService } from './log/crew-log.service';
import { Crew } from './crew.entity';
import { CrewDeletePromptBuilder } from './crew-delete.prompt';
import { CrewDeleteModalBuilder } from './crew-delete.modal';
import { CrewLogModalBuilder } from './crew-log.modal';

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

  @BooleanOption({
    name: 'voice_channel',
    description: 'Should the crew have a voice channel?',
    required: false,
  })
  voice: boolean = false;
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
@UseFilters(DiscordExceptionFilter)
export class CrewCommand {
  private readonly logger = new Logger(CrewCommand.name);

  constructor(
    private readonly botService: BotService,
    private readonly discordService: DiscordService,
    private readonly guildManager: GuildManager,
    private readonly guildService: GuildService,
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
    await interaction.deferReply({ ephemeral: true });

    const memberRef = interaction.member?.user?.id ?? interaction.user?.id;
    const discordGuild = await this.guildManager.fetch(interaction.guildId);
    const member = await discordGuild.members.fetch(interaction);
    const guild = await this.guildService
      .query()
      .byGuild({ guildSf: interaction.guildId })
      .getOneOrFail();

    if (
      guild.config?.crewCreatorRole &&
      !interaction.memberPermissions.has(PermissionsBitField.Flags.Administrator) &&
      !member.roles.cache.has(guild.config.crewCreatorRole)
    ) {
      throw new AuthError('FORBIDDEN', 'Not allowed to create crews').asDisplayable();
    }

    const crew = await this.crewService.registerCrew(
      {
        name: data.name,
        shortName: data.shortName,
        hasMovePrompt: data.movePrompt,
        teamId: data.team,
        createdBy: memberRef,
      },
      { createVoice: data.voice },
    );

    await this.teamService.reconcileGuildForumTags({ guildSf: interaction.guildId });

    await this.botService.replyOrFollowUp(interaction, {
      embeds: [new SuccessEmbed('SUCCESS_GENERIC').setTitle('Crew registered')],
    });
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
    const crewRef = data.crew || interaction.channelId;
    const memberRef = interaction.member?.user?.id ?? interaction.user?.id;

    if (!(await this.memberService.requireCrewAccess(crewRef, memberRef, CrewMemberAccess.ADMIN))) {
      throw new AuthError(
        'FORBIDDEN',
        'Only a crew administrator can perform this action',
      ).asDisplayable();
    }

    await this.crewService.updateCrew(crewRef, {
      hasMovePrompt: data.value,
    });

    await this.botService.replyOrFollowUp(interaction, {
      embeds: [new SuccessEmbed('SUCCESS_GENERIC').setTitle('Crew updated')],
    });
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
    const crewRef = data.crew || interaction.channelId;
    const memberRef = interaction?.member?.user?.id ?? interaction?.user?.id;

    if (!(await this.memberService.requireCrewAccess(crewRef, memberRef, CrewMemberAccess.ADMIN))) {
      throw new AuthError(
        'FORBIDDEN',
        'Only a crew administrator can perform this action',
      ).asDisplayable();
    }

    await this.crewService.updateCrew(crewRef, {
      isPermanent: data.value,
    });

    await this.botService.replyOrFollowUp(interaction, {
      embeds: [new SuccessEmbed('SUCCESS_GENERIC').setTitle('Crew updated')],
    });
  }

  @UseInterceptors(CrewSelectAutocompleteInterceptor)
  @Subcommand({
    name: 'set_secure',
    description: 'Prevents crew information being displayed outside of private channels',
    dmPermission: false,
  })
  async onSetSecure(
    @Context() [interaction]: SlashCommandContext,
    @Options() data: SetFlagCommandParams,
  ) {
    const crewRef = data.crew || interaction.channelId;
    const memberRef = interaction?.member?.user?.id ?? interaction?.user?.id;

    if (!(await this.memberService.requireCrewAccess(crewRef, memberRef, CrewMemberAccess.ADMIN))) {
      throw new AuthError(
        'FORBIDDEN',
        'Only a crew administrator can perform this action',
      ).asDisplayable();
    }

    await this.crewService.updateCrew(crewRef, {
      isSecureOnly: data.value,
    });

    await this.botService.replyOrFollowUp(interaction, {
      embeds: [new SuccessEmbed('SUCCESS_GENERIC').setTitle('Crew updated')],
    });
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
    const channelRef = data.crew || interaction.channelId;
    const memberRef = interaction?.member?.user?.id ?? interaction?.user?.id;
    const channel = await interaction.guild.channels.fetch(channelRef);

    if (!channel.permissionsFor(memberRef).has(PermissionsBitField.Flags.ViewChannel)) {
      throw new AuthError('FORBIDDEN', 'Forbidden');
    }

    await this.memberService.registerCrewMember(channelRef, memberRef, CrewMemberAccess.MEMBER);

    await this.botService.replyOrFollowUp(interaction, {
      embeds: [new SuccessEmbed('SUCCESS_GENERIC').setTitle('Joined crew')],
    });
  }

  @Button('crew/join')
  async onCrewJoinRequest(@Context() [interaction]: ButtonContext) {
    const memberRef = interaction?.member?.user?.id ?? interaction?.user?.id;
    const channel = await interaction.guild.channels.fetch(interaction.channelId);

    if (!channel.permissionsFor(memberRef).has(PermissionsBitField.Flags.ViewChannel)) {
      throw new AuthError('FORBIDDEN', 'Forbidden');
    }

    await this.memberService.registerCrewMember(
      interaction.channelId,
      memberRef,
      CrewMemberAccess.MEMBER,
    );

    await this.botService.replyOrFollowUp(interaction, {
      embeds: [new SuccessEmbed('SUCCESS_GENERIC').setTitle('Joined crew')],
    });
  }

  @UseInterceptors(CrewSelectAutocompleteInterceptor)
  @Subcommand({
    name: 'prompt',
    description:
      'Show a generic prompt to join the crew of this channel. Must be run in crew channel.',
    dmPermission: false,
  })
  async onCrewJoinPrompt(@Context() [interaction]: SlashCommandContext) {
    const crew = await this.crewService
      .query()
      .byCrew({ crewSf: interaction.channelId })
      .getOneOrFail();
    await this.crewService.crewJoinPrompt(crew);

    await this.botService.replyOrFollowUp(interaction, {
      embeds: [new SuccessEmbed('SUCCESS_GENERIC').setTitle('Done')],
    });
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
    const channelRef = data.crew || interaction.channelId;
    const memberRef = interaction.member?.user?.id ?? interaction.user?.id;
    const result = await this.memberService.removeCrewMember(channelRef, memberRef);

    if (result.affected) {
      await this.botService.replyOrFollowUp(interaction, {
        embeds: [
          new SuccessEmbed('SUCCESS_GENERIC')
            .setTitle('Left crew')
            .setDescription('You can join again any time.'),
        ],
      });
    } else {
      this.logger.debug(JSON.stringify(result));
      await this.botService.replyOrFollowUp(interaction, {
        embeds: [new ErrorEmbed('ERROR_GENERIC').setTitle('No change')],
      });
    }
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
    const channelRef = data.crew || interaction.channelId;
    const memberRef = interaction.member?.user?.id ?? interaction.user?.id;

    if (
      !(await this.memberService.requireCrewAccess(channelRef, memberRef, CrewMemberAccess.OWNER))
    ) {
      throw new AuthError(
        'FORBIDDEN',
        'Only crew owner or guild admin may transfer ownership',
      ).asDisplayable();
    }

    const targetMember = await this.memberRepo.findOne({
      where: { crewSf: channelRef, memberSf: data.member.id },
    });

    if (!targetMember) {
      throw new ValidationError(
        'VALIDATION_FAILED',
        `${data.member} is not a member of this team`,
      ).asDisplayable();
    }

    await this.memberService.updateCrewMember(
      { crewSf: channelRef, memberSf: targetMember.memberSf },
      {
        access: CrewMemberAccess.OWNER,
      },
    );

    const oldOwners = await this.memberRepo.findBy({
      crewSf: Equal(channelRef),
      memberSf: Not(Equal(targetMember.memberSf)),
      access: Equal(CrewMemberAccess.OWNER),
    });

    for (const owner of oldOwners) {
      await this.memberService.updateCrewMember(
        { crewSf: owner.crewSf, memberSf: owner.memberSf },
        {
          access: CrewMemberAccess.ADMIN,
        },
      );
    }

    await this.botService.replyOrFollowUp(interaction, {
      embeds: [new SuccessEmbed('SUCCESS_GENERIC').setTitle('Crew ownership transferred')],
    });
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
    const channelRef = data.crew || interaction.channelId;
    const memberRef = interaction.member?.user?.id ?? interaction.user?.id;

    if (
      !(await this.memberService.requireCrewAccess(channelRef, memberRef, CrewMemberAccess.ADMIN))
    ) {
      throw new AuthError('FORBIDDEN', 'You are not a member of this team').asDisplayable();
    }

    const targetMember = await this.memberRepo.findOne({
      where: { crewSf: channelRef, memberSf: data.member.id },
    });

    if (!targetMember) {
      throw new ValidationError(
        'VALIDATION_FAILED',
        `${data.member} is not a member of this team`,
      ).asDisplayable();
    }

    await this.memberService.updateCrewMember(targetMember, {
      access: CrewMemberAccess.ADMIN,
    });

    await this.botService.replyOrFollowUp(interaction, {
      embeds: [new SuccessEmbed('SUCCESS_GENERIC').setTitle('Promoted to crew administrator')],
    });
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
    const channelRef = data.crew || interaction.channelId;
    const memberRef = interaction.member?.user?.id ?? interaction.user?.id;

    if (
      !(await this.memberService.requireCrewAccess(channelRef, memberRef, CrewMemberAccess.ADMIN))
    ) {
      throw new AuthError('FORBIDDEN', 'You are not a member of this team').asDisplayable();
    }

    await this.memberService.registerCrewMember(
      channelRef,
      data.member.id,
      CrewMemberAccess.MEMBER,
    );

    await this.botService.replyOrFollowUp(interaction, {
      embeds: [new SuccessEmbed('SUCCESS_GENERIC').setTitle('Crew member registered')],
    });
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
    const channelRef = data.crew || interaction.channelId;
    const memberRef = interaction.member?.user?.id ?? interaction.user?.id;

    if (
      !(await this.memberService.requireCrewAccess(channelRef, memberRef, CrewMemberAccess.ADMIN))
    ) {
      throw new AuthError(
        'FORBIDDEN',
        'Only a crew administrator can perform this action',
      ).asDisplayable();
    }

    await this.memberService.removeCrewMember(channelRef, data.member.id);

    await this.botService.replyOrFollowUp(interaction, {
      embeds: [new SuccessEmbed('SUCCESS_GENERIC').setTitle('Crew member removed')],
    });
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
    await interaction.deferReply({ ephemeral: true });

    const channelRef = data.crew || interaction.channelId;
    const memberRef = interaction.member?.user?.id ?? interaction.user?.id;
    if (
      !(await this.memberService.requireCrewAccess(channelRef, memberRef, CrewMemberAccess.ADMIN))
    ) {
      throw new AuthError(
        'FORBIDDEN',
        'Only a crew administrator can perform this action',
      ).asDisplayable();
    }

    await this.crewService.deregisterCrew(channelRef, memberRef, {
      tag: data.tag,
      archiveSf: data.archive?.id,
    });

    await this.botService.replyOrFollowUp(interaction, {
      embeds: [new SuccessEmbed('SUCCESS_GENERIC').setTitle('Crew archived')],
    });
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
    const memberRef = interaction.member?.user?.id ?? interaction.user?.id;

    if (!interaction.memberPermissions.has(PermissionsBitField.Flags.Administrator)) {
      throw new AuthError(
        'FORBIDDEN',
        'Only a guild administrator can perform this action',
      ).asDisplayable();
    }

    await interaction.deferReply({ ephemeral: true });

    let crews: Crew[];
    try {
      crews = await this.crewRepo.find({
        where: { guild: { guildSf: interaction.guildId }, isPermanent: false },
      });
    } catch (err) {
      throw new DatabaseError('QUERY_FAILED', 'Failed to fetch crews', err);
    }

    const errors: Error[] = [];
    const result = compact(
      await Promise.all(
        crews.map(async (crew) => {
          try {
            return await this.crewService.deregisterCrew(crew.crewSf, memberRef, {
              tag: data.tag,
              archiveSf: data.archive?.id,
            });
          } catch (err) {
            errors.push(err);
          }
        }),
      ),
    );

    if (errors.length) {
      await this.botService.replyOrFollowUp(interaction, {
        embeds: [
          new ErrorEmbed('ERROR_GENERIC').setTitle(
            `Purged ${result.length} crews. Failed to purge ${errors.length} crews.`,
          ),
        ],
      });

      for (const r of result) {
        this.logger.log(`Archived crew ${r.name} in ${r.guild.name}`);
      }

      for (const e of errors) {
        this.logger.error(`Failed to purge crew`, e.stack);
      }

      return;
    }

    await this.botService.replyOrFollowUp(interaction, {
      embeds: [new SuccessEmbed('SUCCESS_GENERIC').setTitle('Crews purged')],
    });
  }

  @Button('crew/reqdelete/:crew')
  async onCrewDeleteRequest(
    @Context() [interaction]: ButtonContext,
    @ComponentParam('crew') crewRef: Snowflake,
  ) {
    const modal = new CrewDeleteModalBuilder().addForm({ crewSf: crewRef });
    return interaction.showModal(modal);
  }

  @Modal('crew/delete/:crew')
  async onCrewDelete(
    @Context() [interaction]: ModalContext,
    @ModalParam('crew') channelRef: Snowflake,
  ) {
    const memberRef = interaction.member?.user?.id ?? interaction.user?.id;
    const reason = interaction.fields.getTextInputValue('crew/delete/reason');

    // No access control because this is used by the audit prompt, access is controlled to the prompt itself.
    const result = await this.crewService.deregisterCrew(channelRef, memberRef);

    await this.botService.replyOrFollowUp(interaction, {
      embeds: [new SuccessEmbed('SUCCESS_GENERIC').setTitle('Crew deleted')],
    });

    const member = await this.memberService.resolveGuildMember(memberRef, channelRef);

    if (result) {
      await interaction.channel.send(
        new CrewDeletePromptBuilder().addCrewDeleteMessage(result, member, reason).build(),
      );
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
    let crew: Crew;
    const memberRef = interaction.member?.user?.id ?? interaction.user?.id;
    const crewRef = data.crew || interaction.channelId;

    crew = await this.crewService.query().byCrew({ crewSf: crewRef }).getOne();

    if (crew) {
      await this.crewService.sendIndividualStatus(
        { crewSf: crewRef },
        interaction.channelId,
        memberRef,
      );
    } else {
      await this.crewService.sendAllStatus(
        { guildSf: interaction.guildId },
        interaction.channelId,
        memberRef,
      );
    }

    await this.botService.replyOrFollowUp(interaction, {
      embeds: [new SuccessEmbed('SUCCESS_GENERIC').setTitle('Status update scheduled')],
    });
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
    const channelRef = data.crew || interaction.channelId;
    const memberRef = interaction.member?.user?.id ?? interaction.user?.id;

    if (
      !(await this.memberService.requireCrewAccess(
        channelRef,
        memberRef,
        CrewMemberAccess.ADMIN,
        false,
      ))
    ) {
      throw new AuthError(
        'FORBIDDEN',
        'Only a crew administrator can perform this action',
      ).asDisplayable();
    }

    const modal = new CrewLogModalBuilder().addForm({ crewSf: channelRef });
    return interaction.showModal(modal);
  }

  @Button('crew/log')
  async onCrewLogButton(@Context() [interaction]: ButtonContext) {
    const modal = new CrewLogModalBuilder().addForm({ crewSf: interaction.channelId });
    return interaction.showModal(modal);
  }

  @Modal('crew/log/:crew')
  async onCrewLog(@Context() [interaction]: ModalContext, @ModalParam('crew') crewRef: Snowflake) {
    const memberRef = interaction.member?.user?.id ?? interaction.user?.id;
    const content = interaction.fields.getTextInputValue('crew/log/content');

    if (
      !(await this.memberService.requireCrewAccess(
        crewRef,
        memberRef,
        CrewMemberAccess.ADMIN,
        false,
      ))
    ) {
      throw new AuthError(
        'FORBIDDEN',
        'Only a crew administrator can perform this action',
      ).asDisplayable();
    }

    const result = await this.logService.addCrewLog(crewRef, memberRef, { content });

    await this.botService.replyOrFollowUp(interaction, {
      embeds: [new SuccessEmbed('SUCCESS_GENERIC').setTitle('Log added')],
    });
  }

  @UseInterceptors(CrewSelectAutocompleteInterceptor)
  @Subcommand({
    name: 'set_triage',
    description: 'Set the crew that will receive tickets by default. Guild Admin only',
    dmPermission: false,
  })
  async onGuildSetTriageCrew(
    @Context() [interaction]: SlashCommandContext,
    @Options() { crew }: SelectCrewCommandParams,
  ) {
    if (!crew) {
      throw new ValidationError('VALIDATION_FAILED', 'Invalid role').asDisplayable();
    }

    if (!interaction.memberPermissions.has(PermissionsBitField.Flags.Administrator)) {
      throw new AuthError(
        'FORBIDDEN',
        'Only a guild administrator can perform this action',
      ).asDisplayable();
    }

    await this.guildService.setConfig({ guildSf: interaction.guildId }, 'ticketTriageCrew', crew);

    await this.botService.replyOrFollowUp(interaction, {
      embeds: [new SuccessEmbed('SUCCESS_GENERIC').setTitle('Configuration updated')],
    });
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
    const channelRef = data.crew || interaction.channelId;
    const memberRef = interaction.member?.user?.id ?? interaction.user?.id;

    if (
      !(await this.memberService.requireCrewAccess(channelRef, memberRef, CrewMemberAccess.ADMIN))
    ) {
      throw new AuthError(
        'FORBIDDEN',
        'Only a crew administrator can perform this action',
      ).asDisplayable();
    }

    const result = await this.shareService.shareCrew({
      guildId: data.guild,
      crewSf: channelRef,
      createdBy: memberRef,
    });

    await this.botService.replyOrFollowUp(interaction, {
      embeds: [new SuccessEmbed('SUCCESS_GENERIC').setTitle('Crew shared')],
    });
  }

  @UseInterceptors(CrewSelectAutocompleteInterceptor)
  @Subcommand({
    name: 'prune',
    description: 'Manually trigger check to remove inactive crew members',
    dmPermission: false,
  })
  async onCrewPrune(
    @Context() [interaction]: SlashCommandContext,
    @Options() data: SelectCrewCommandParams,
  ) {
    const channelRef = data.crew || interaction.channelId;
    const memberRef = interaction.member?.user?.id ?? interaction.user?.id;

    if (
      !(await this.memberService.requireCrewAccess(
        channelRef,
        memberRef,
        CrewMemberAccess.ADMIN,
        false,
      ))
    ) {
      throw new AuthError(
        'FORBIDDEN',
        'Only a crew administrator can perform this action',
      ).asDisplayable();
    }

    await this.memberService.reconcileCrewMembership({ crewSf: channelRef });

    await this.botService.replyOrFollowUp(interaction, {
      embeds: [new SuccessEmbed('SUCCESS_GENERIC').setTitle('Crew cleaning scheduled')],
    });
  }
}
