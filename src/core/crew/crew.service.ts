import { Inject, Injectable, Logger, forwardRef } from '@nestjs/common';
import { InsertResult, UpdateResult } from 'typeorm';
import {
  CategoryChannel,
  ChannelType,
  Client,
  DiscordAPIError,
  GuildBasedChannel,
  GuildManager,
  OverwriteResolvable,
  PermissionsBitField,
  Snowflake,
  userMention,
} from 'discord.js';
import { toSlug } from 'src/util';
import {
  AuthError,
  DatabaseError,
  ExternalError,
  InternalError,
  ValidationError,
} from 'src/errors';
import { AccessMode, CrewMemberAccess, TicketTag } from 'src/types';
import { DiscordService } from 'src/bot/discord.service';
import { BotService } from 'src/bot/bot.service';
import { DiscordActionTarget, DiscordActionType } from 'src/bot/discord-actions.consumer';
import { SelectGuildDto } from 'src/core/guild/guild.entity';
import { GuildSettingName } from 'src/core/guild/guild-setting.entity';
import { TeamService } from 'src/core/team/team.service';
import { SelectTeamDto } from 'src/core/team/team.entity';
import { TicketService } from 'src/core/ticket/ticket.service';
import { AccessService } from 'src/core/access/access.service';
import { AccessRuleMode } from 'src/core/access/access-rule';
import { WarService } from 'src/game/war/war.service';
import { AccessEntry, AccessRuleType, SelectAccessEntryDto } from 'src/core/access/access.entity';
import {
  ArchiveCrewDto,
  Crew,
  CrewConfigValue,
  InsertCrewDto,
  SelectCrewDto,
  UpdateCrewDto,
} from './crew.entity';
import { CrewAction, InsertCrewAccessDto } from './crew-access.entity';
import { CrewRepository } from './crew.repository';
import { CrewSettingRepository } from './crew-setting.repository';
import { CrewSettingName, InsertCrewSettingDto } from './crew-setting.entity';
import { CrewAccessRepository } from './crew-access.repository';
import { CrewMemberService } from './member/crew-member.service';
import { CrewMember } from './member/crew-member.entity';
import { CrewAuditPromptBuilder } from './crew-audit.prompt';
import { CrewInfoPromptBuilder } from './crew-info.prompt';
import { CrewStatusPromptBuilder } from './crew-status.prompt';
import { CrewQueryBuilder } from './crew.query';

type RegisterCrewOptions = Partial<{
  skipApproval: boolean;
}>;

export abstract class CrewService {
  abstract query(): CrewQueryBuilder;
  abstract registerCrew(data: InsertCrewDto, options?: RegisterCrewOptions): Promise<InsertResult>;
  abstract reconcileCrew(crewRef: SelectCrewDto): Promise<void>;
  abstract deregisterCrew(
    crewRef: SelectCrewDto,
    memberRef: Snowflake,
    options?: ArchiveCrewDto,
  ): Promise<Crew | undefined>;
  abstract grantAccess(access: InsertCrewAccessDto | InsertCrewAccessDto[]): Promise<InsertResult>;
  abstract updateCrew(crewRef: SelectCrewDto, update: UpdateCrewDto): Promise<UpdateResult>;
  abstract setConfig(
    template: Required<Pick<InsertCrewSettingDto, 'updatedBy' | 'crewId'>>,
    config: CrewConfigValue,
  ): Promise<InsertResult>;
  abstract sendIndividualStatus(
    crewRef: SelectCrewDto,
    targetChannelRef: Snowflake,
    memberRef: Snowflake,
  ): Promise<void>;
  abstract sendAllStatus(
    guildRef: SelectGuildDto,
    targetChannelRef: Snowflake,
    memberRef: Snowflake,
  ): Promise<void>;
  abstract queueSendCrewInfo(crew: Crew): Promise<void>;
  abstract getOrCreateDefaultCrewAccessRule(crew: Crew): Promise<AccessEntry>;
}

@Injectable()
export class CrewServiceImpl extends CrewService {
  private readonly logger = new Logger(CrewService.name);

  constructor(
    private readonly client: Client,
    private readonly guildManager: GuildManager,
    private readonly discordService: DiscordService,
    private readonly botService: BotService,
    private readonly teamService: TeamService,
    @Inject(forwardRef(() => TicketService)) private readonly ticketService: TicketService,
    @Inject(forwardRef(() => CrewMemberService)) private readonly memberService: CrewMemberService,
    private readonly crewRepo: CrewRepository,
    private readonly settingRepo: CrewSettingRepository,
    private readonly accessRepo: CrewAccessRepository,
    private readonly warService: WarService,
    @Inject(forwardRef(() => AccessService)) private readonly accessService: AccessService,
  ) {
    super();
  }

  query() {
    return new CrewQueryBuilder(this.crewRepo);
  }

  async grantAccess(data: InsertCrewAccessDto | InsertCrewAccessDto[]) {
    return await this.accessRepo.insert(data);
  }

  async registerCrew(data: InsertCrewDto, options: RegisterCrewOptions = { skipApproval: false }) {
    const teamRef: SelectTeamDto = { id: data.teamId };
    const team = await this.teamService.query().byTeam(teamRef).getOneOrFail();
    const discordGuild = await this.guildManager.fetch(team.guild.guildSf);
    const category = await discordGuild.channels.fetch(team.categorySf);

    if (!category) {
      throw new InternalError('INTERNAL_SERVER_ERROR', 'Failed to resolve team category channel');
    }

    data.name = data.name || category.name;
    data.shortName = data.shortName || data.name;
    data.slug = data.slug || toSlug(data.name);

    if (/[^a-zA-Z0-9-_ ]/.test(data.shortName)) {
      throw new ValidationError(
        'VALIDATION_FAILED',
        'Discord role names cannot contain special characters. The main crew `name` can contain special characters _if_ you provide a `short_name` option without non-alphanumeric characters. Allowed special characters include spaces, dash (`-`) and underscore (`_`).',
      ).asDisplayable();
    }

    if (data.shortName.length > 20) {
      throw new ValidationError(
        'VALIDATION_FAILED',
        'Your name is too long to create a tag. Please try again with a `short_name` in your command that is under 20 characters.',
      ).asDisplayable();
    }

    const usedRoles = await discordGuild.roles.fetch();
    if (usedRoles.find((role) => role.name.toLowerCase() === data.shortName.toLowerCase())) {
      throw new ValidationError(
        'VALIDATION_FAILED',
        `A role with the name _${data.shortName}_ already exists. Please choose something else.`,
      ).asDisplayable();
    }

    const { settings: settingsData, ...crewData } = data;

    const crew = this.crewRepo.create(
      Object.assign(crewData, {
        guildId: team.guildId,
        teamId: team.id,
      }),
    );

    if (options.skipApproval) {
      crew.approvedBy = data.createdBy;
    }

    const result = await this.crewRepo.insert(crew);

    if (result?.identifiers) {
      const {
        identifiers: [crewRef],
      } = result;
      const rule = await this.getOrCreateDefaultCrewAccessRule(crew);

      await this.grantAccess({
        crewId: crewRef as unknown as string,
        createdBy: data.createdBy,
        ruleId: rule.id,
        access: AccessMode.WRITE,
        action: CrewAction.CREW_TICKET_MANAGE, // Placeholder
      });

      await this.settingRepo.insert(
        Object.entries({
          [CrewSettingName.CREW_TRIAGE]: false,
          [CrewSettingName.CREW_TEXT_CHANNEL]: true,
          [CrewSettingName.CREW_VOICE_CHANNEL]: false,
          ...settingsData,
        }).map(([name, value]) =>
          this.settingRepo.create({
            crewId: crewRef as unknown as string,
            updatedBy: data.createdBy,
            name: name as CrewSettingName,
            value: value as unknown as string,
          }),
        ),
      );

      try {
        await this.memberService.registerCrewMember(
          crewRef,
          crew.createdBy,
          CrewMemberAccess.OWNER,
        );
      } catch (err) {
        this.logger.error(
          `Crew was created successfully but failed to register crew member: ${err.message}`,
          err.stack,
        );
      }

      await this.reconcileCrew(crewRef);
    }

    return result;
  }

  public async reconcileCrew(crewRef: SelectCrewDto) {
    const crew = await this.query()
      .byCrew(crewRef)
      .withTeam()
      .withMembers()
      .withGuildSettings()
      .withSettings()
      .getOneOrFail();

    const {
      [CrewSettingName.CREW_TEXT_CHANNEL]: crewTextFlag,
      [CrewSettingName.CREW_VOICE_CHANNEL]: crewVoiceFlag,
    } = crew.getConfig();

    if (!crew.approvedBy) {
      return this.queueEnsureApprovalPrompt(crew);
    } else {
      await this.queueEnsureAuditPrompt(crew);
    }

    if (!crew.roleSf) {
      await this.queueEnsureRole(crew);
      return this.reconcileCrew(crewRef);
    }

    if (
      (!crew.crewSf && crewTextFlag.asBoolean()) ||
      (!crew.voiceSf && crewVoiceFlag.asBoolean())
    ) {
      for (const member of crew.members) {
        member.crew = crew;
        await this.queueEnsureMemberRole(member);
      }
      await this.queueEnsureChannels(crew);
      return this.reconcileCrew(crewRef);
    }

    await this.crewRepo.update({ id: crew.id }, { processedAt: new Date() });
    return await this.queueSendCrewInfo(crew);
  }

  private async queueEnsureRole(crew: Crew) {
    // await this.botService.publishDiscordAction({
    //   type: DiscordActionType.ENSURE_ROLE,
    //   guildSf: crew.guild.guildSf,
    //   role: { id: crew.roleSf, name: crew.shortName },
    //   target: { type: DiscordActionTarget.CREW, crewId: crew.id, field: 'roleSf' },
    // });

    const role = await this.discordService.ensureRole(crew.guild.guildSf, crew.roleSf, {
      name: crew.shortName,
    });

    if (role.id !== crew.roleSf) {
      await this.updateCrew(crew, { roleSf: role.id });
    }
  }

  private async queueEnsureMemberRole(member: CrewMember) {
    if (!member.crew.roleSf) {
      throw new InternalError('INTERNAL_SERVER_ERROR', 'Crew role does not exist');
    }

    // await this.botService.publishDiscordAction({
    //   type: DiscordActionType.ASSIGN_ROLE,
    //   guildSf: member.crew.guild.guildSf,
    //   roleSf: member.crew.roleSf,
    //   memberSf: member.memberSf,
    //   target: {
    //     type: DiscordActionTarget.CREW_MEMBER,
    //     crewId: member.crew.id,
    //     memberSf: member.memberSf,
    //   },
    // });

    await this.discordService.assignRole(
      member.crew.guild.guildSf,
      member.crew.roleSf,
      member.memberSf,
    );
  }

  private async queueEnsureChannels(crew: Crew) {
    if (!crew.roleSf) {
      throw new InternalError('INTERNAL_SERVER_ERROR', 'Crew role does not exist');
    }

    const discordGuild = await this.guildManager.fetch(crew.guild.guildSf);
    const {
      [GuildSettingName.CREW_DETAULT_ROLE]: crewDefaultRole,
      [GuildSettingName.GUILD_CREW_PREFIX]: crewPrefix,
      [GuildSettingName.GUILD_VOICE_CATEGORY]: guildVoiceCategory,
    } = crew.guild.getConfig();
    const {
      [CrewSettingName.CREW_TEXT_CHANNEL]: crewTextChannelFlag,
      [CrewSettingName.CREW_VOICE_CHANNEL]: crewVoiceChannelFlag,
    } = crew.getConfig();

    const {
      crewSf,
      voiceSf,
      team: { categorySf: parent },
    } = crew;

    const name = crewPrefix ? crewPrefix + crew.slug : `c-${crew.slug}`;

    const permissionOverwrites: OverwriteResolvable[] = [
      {
        id: discordGuild.roles.everyone.id,
        deny: [PermissionsBitField.Flags.ViewChannel],
      },
      {
        id: crew.roleSf,
        allow: [PermissionsBitField.Flags.ManageMessages, PermissionsBitField.Flags.ManageThreads],
      },
    ];

    const botMember = await discordGuild.members.fetchMe();
    const botRole = discordGuild.roles.botRoleFor(botMember);
    if (botRole) {
      permissionOverwrites.push({
        id: botRole.id,
        allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.ManageMessages],
      });
    }

    if (crewDefaultRole) {
      permissionOverwrites.push({
        id: crewDefaultRole,
        allow: [PermissionsBitField.Flags.ViewChannel],
      });
    }

    if (!crewSf && crewTextChannelFlag.asBoolean()) {
      // await this.botService.publishDiscordAction({
      //   type: DiscordActionType.ENSURE_CHANNEL,
      //   guildSf: crew.guild.guildSf,
      //   channel: { name, id: crewSf, parent, type: ChannelType.GuildText, permissionOverwrites },
      //   target: { type: DiscordActionTarget.CREW, crewId: crew.id, field: 'crewSf' },
      // });
      const textChannel = await this.discordService.ensureChannel(crew.guild.guildSf, crewSf, {
        name,
        parent,
        type: ChannelType.GuildText,
        permissionOverwrites,
      });

      if (textChannel.id !== crewSf) {
        await this.updateCrew(crew, { crewSf: textChannel.id });
      }
    }

    if (!voiceSf && crewVoiceChannelFlag.asBoolean()) {
      const parent = guildVoiceCategory || crew.team.categorySf;
      // await this.botService.publishDiscordAction({
      //   type: DiscordActionType.ENSURE_CHANNEL,
      //   guildSf: crew.guild.guildSf,
      //   channel: { name, id: voiceSf, parent, type: ChannelType.GuildVoice, permissionOverwrites },
      //   target: { type: DiscordActionTarget.CREW, crewId: crew.id, field: 'voiceSf' },
      // });
      const voiceChannel = await this.discordService.ensureChannel(crew.guild.guildSf, voiceSf, {
        name,
        parent,
        type: ChannelType.GuildVoice,
        permissionOverwrites,
      });

      if (voiceChannel.id !== voiceSf) {
        await this.updateCrew(crew, { voiceSf: voiceChannel.id });
      }
    }
  }

  private async queueEnsureApprovalPrompt(crew: Crew) {
    const war = await this.warService.query().byCurrent().getOneOrFail();
    const guildConfig = crew.guild.getConfig();
    const auditChannelSf = guildConfig[GuildSettingName.CREW_DEFAULT_AUDIT_CHANNEL];

    if (auditChannelSf) {
      const discordGuild = await this.guildManager.fetch(crew.guild.guildSf);
      const member = await discordGuild.members.fetch(crew.createdBy);
      const prompt = new CrewAuditPromptBuilder().addApprovalMessage(crew, war.warNumber, member);

      // await this.botService.publishDiscordAction({
      //   type: DiscordActionType.SEND_MESSAGE,
      //   guildSf: crew.guild.guildSf,
      //   channelSf: auditChannelSf,
      //   message: { id: crew.auditMessageSf, ...prompt.build() },
      //   target: { type: DiscordActionTarget.CREW, crewId: crew.id, field: 'auditMessageSf' },
      // });

      const [, messages] = await this.discordService.sendMessage(
        crew.guild.guildSf,
        auditChannelSf,
        {
          id: crew.auditMessageSf,
          ...prompt.build(),
        },
      );

      if (!Array.isArray(messages) || !messages.length || messages.length > 1) {
        throw new InternalError('INTERNAL_SERVER_ERROR', 'Incorrect number of audit messages');
      }

      const [auditMessage] = messages;

      if (crew.auditMessageSf !== auditMessage.id) {
        await this.updateCrew(crew, { auditMessageSf: auditMessage.id });
      }
    }
  }

  private async queueEnsureAuditPrompt(crew: Crew) {
    const war = await this.warService.query().byCurrent().getOneOrFail();
    const guildConfig = crew.guild.getConfig();
    const auditChannelSf = guildConfig[GuildSettingName.CREW_DEFAULT_AUDIT_CHANNEL];

    if (auditChannelSf) {
      const discordGuild = await this.guildManager.fetch(crew.guild.guildSf);
      const approvedBy = await discordGuild.members.fetch(crew.approvedBy);
      const createdBy = await discordGuild.members.fetch(crew.createdBy);
      const prompt = new CrewAuditPromptBuilder()
        .addAuditMessage(crew, war.warNumber, createdBy)
        .addApprovedMessage(approvedBy)
        .addCrewDeleteButton(crew);

      // await this.botService.publishDiscordAction({
      //   type: DiscordActionType.SEND_MESSAGE,
      //   guildSf: crew.guild.guildSf,
      //   channelSf: auditChannelSf,
      //   message: { id: crew.auditMessageSf, ...prompt.build() },
      //   target: { type: DiscordActionTarget.CREW, crewId: crew.id, field: 'auditMessageSf' },
      // });

      const [, messages] = await this.discordService.sendMessage(
        crew.guild.guildSf,
        auditChannelSf,
        {
          id: crew.auditMessageSf,
          ...prompt.build(),
        },
      );

      if (!Array.isArray(messages) || !messages.length || messages.length > 1) {
        throw new InternalError('INTERNAL_SERVER_ERROR', 'Incorrect number of audit messages');
      }

      const [auditMessage] = messages;

      if (crew.auditMessageSf !== auditMessage.id) {
        await this.updateCrew(crew, { auditMessageSf: auditMessage.id });
      }
    }
  }

  public async queueSendCrewInfo(crew: Crew) {
    const discordGuild = await this.guildManager.fetch(crew.guild.guildSf);

    if (!crew.crewSf) {
      throw new InternalError('INTERNAL_SERVER_ERROR', 'Crew channel does not exist');
    }

    const channel = await discordGuild.channels.fetch(crew.crewSf);

    if (!channel || !channel.isTextBased()) {
      throw new InternalError('INTERNAL_SERVER_ERROR', 'Invalid channel');
    }

    const members = await this.memberService.query().byCrew(crew).getMany();
    const prompt = new CrewInfoPromptBuilder()
      .addCrewPromptMessage(crew, members)
      .addCrewControls(crew);

    await this.botService.publishDiscordAction({
      type: DiscordActionType.SEND_MESSAGE,
      guildSf: crew.guild.guildSf,
      channelSf: crew.crewSf,
      message: prompt.build(),
    });

    await this.discordService.sendMessage(crew.guild.guildSf, crew.crewSf, prompt.build());
  }

  async setConfig(
    template: Required<Pick<InsertCrewSettingDto, 'updatedBy' | 'crewId'>>,
    config: CrewConfigValue,
  ) {
    const records = Object.entries(config).map(([name, value]) =>
      this.settingRepo.create({ ...template, name: name as CrewSettingName, value }),
    );

    const result = this.settingRepo.upsert(records, ['crewId', 'name']);
    this.logger.log(`Updated crew config for ${template.crewId}`);
    return result;
  }

  public async deregisterCrew(
    crewRef: SelectCrewDto,
    memberRef: Snowflake,
    options: ArchiveCrewDto = {},
  ) {
    const crew = await this.query()
      .byCrew(crewRef)
      .withTickets()
      .withGuildSettings()
      .getOneOrFail();
    const discordGuild = await this.guildManager.fetch(crew.guild.guildSf);

    // Close all currently open tickets
    const errors: Error[] = [];
    await Promise.all(
      crew.tickets.map(async (ticket) => {
        try {
          const thread = await discordGuild.channels.fetch(ticket.threadSf);

          if (!thread || !thread.isThread()) {
            throw new InternalError('INTERNAL_SERVER_ERROR', 'Invalid thread');
          }

          return this.ticketService.updateTicket(
            { id: ticket.id },
            { state: TicketTag.DONE, updatedBy: memberRef },
          );
        } catch (err) {
          errors.push(err);
        }
      }),
    );

    const discussion = await discordGuild.channels.fetch(crew.crewSf);

    // if (!discussion || !discussion.isTextBased()) {
    //   throw new InternalError('INTERNAL_SERVER_ERROR', 'Invalid channel');
    // }

    const voice = crew.voiceSf && (await discordGuild.channels.fetch(crew.voiceSf));

    // if (crew.voiceSf && !voice.isVoiceBased()) {
    //   throw new InternalError('INTERNAL_SERVER_ERROR', 'Invalid voice channel');
    // }

    const role = await discordGuild.roles.fetch(crew.roleSf);

    // if (!role) {
    //   throw new InternalError('INTERNAL_SERVER_ERROR', 'Invalid role');
    // }

    const result = await this.crewRepo.updateReturning(crewRef, {
      deletedAt: new Date(),
      deletedBy: memberRef,
    });

    if (crew.guild?.getConfig()['crew.audit_channel'] && crew.auditMessageSf) {
      const audit = await discordGuild.channels.fetch(crew.guild.getConfig()['crew.audit_channel']);

      if (audit && audit.isTextBased()) {
        try {
          await audit.messages.delete(crew.auditMessageSf);
        } catch (err) {
          if ((err as DiscordAPIError).code !== 10008) {
            // Unknown message
            throw err;
          }
        }
      } else {
        this.logger.warn(
          `Could not delete audit message for crew ${crew.name} in ${crew.guild.name}: no audit channel`,
        );
      }
    }

    if (options.archiveSf) {
      let archiveTargetCategory;

      try {
        archiveTargetCategory = await discordGuild.channels.fetch(options.archiveSf);
      } catch (err) {
        throw new ExternalError(
          'DISCORD_API_ERROR',
          `Failed to load archive category ${options.archiveSf} for crew ${crew.name} in ${discordGuild.name}: ${err.message}`,
          err,
        );
      }

      if (archiveTargetCategory) {
        try {
          await Promise.all([
            discussion &&
              discussion.edit({
                name: options.tag
                  ? [discussion.name, options.tag.toLowerCase()].join('-')
                  : discussion.name,
                permissionOverwrites: [
                  { id: discordGuild.id, deny: [PermissionsBitField.Flags.ViewChannel] },
                ],
                parent: archiveTargetCategory as CategoryChannel,
              }),
            role && role.delete(),
            voice && voice.delete(),
          ]);
        } catch (err) {
          throw new ExternalError('DISCORD_API_ERROR', 'Failed to archive channel', err);
        }
      } else {
        throw new InternalError(
          'INTERNAL_SERVER_ERROR',
          `Archive category ${options.archiveSf} does not exist`,
        );
      }
    } else {
      try {
        await Promise.all([
          role && role.delete(),
          voice && voice.delete(),
          discussion && discussion.delete(),
        ]);
      } catch (err) {
        throw new ExternalError('DISCORD_API_ERROR', 'Failed to delete channels and role');
      }
    }

    if (result?.affected) {
      this.logger.log(
        `${userMention(memberRef)} archived crew ${crew.name} (${crew.crewSf}) in ${discordGuild.name} (${discordGuild.id})`,
      );

      return (result?.raw as Crew[]).pop();
    }
  }

  public async updateCrew(crewRef: SelectCrewDto, update: UpdateCrewDto) {
    try {
      const { id, crewSf } = crewRef;
      return await this.crewRepo.update(id ? id : { crewSf }, update);
    } catch (err) {
      throw new DatabaseError('QUERY_FAILED', 'Failed to update crew', err);
    }
  }

  public async sendIndividualStatus(
    crewRef: SelectCrewDto,
    targetChannelRef: Snowflake,
    memberRef: Snowflake,
  ) {
    const crew = await this.query()
      .byCrew(crewRef)
      .withLogs()
      .withMembers()
      .withSettings()
      .getOneOrFail();
    const discordGuild = await this.guildManager.fetch(crew.guild.guildSf);
    const crewChannel = await discordGuild.channels.fetch(crewRef.crewSf);
    const { [CrewSettingName.CREW_OPSEC]: opsecFlag } = crew.getConfig();

    if (!crewChannel.permissionsFor(memberRef).has(PermissionsBitField.Flags.ViewChannel, true)) {
      throw new AuthError('FORBIDDEN', 'You do not have access to that crew').asDisplayable();
    }

    const targetChannel =
      crewRef.crewSf === targetChannelRef
        ? crewChannel
        : await discordGuild.channels.fetch(targetChannelRef);

    if (!targetChannel || !targetChannel.isTextBased()) {
      throw new InternalError('INTERNAL_SERVER_ERROR', 'Invalid channel');
    }

    try {
      if (
        opsecFlag &&
        opsecFlag.asBoolean() &&
        !(await this.discordService.isChannelPrivate(targetChannel))
      ) {
        throw new AuthError('FORBIDDEN', 'This channel is not secure').asDisplayable();
      }
    } catch (err) {
      if (err instanceof AuthError) {
        throw err;
      } else {
        throw new ExternalError(
          'DISCORD_API_ERROR',
          `Failed to resolve target channel for ${crew.name} in ${crew.guild.name}`,
        );
      }
    }

    const war = await this.warService.query().byCurrent().getOneOrFail();
    const prompt = new CrewStatusPromptBuilder().addIndividualCrewStatus(
      discordGuild,
      crew,
      war.warNumber,
    );

    if (targetChannel.id === crew.crewSf) {
      prompt.add(new CrewInfoPromptBuilder().addCrewControls(crew));
    }

    await targetChannel.send(prompt.build());
  }

  public async sendAllStatus(
    guildRef: SelectGuildDto,
    targetChannelRef: Snowflake,
    memberRef: Snowflake,
  ) {
    const discordGuild = await this.guildManager.fetch(guildRef.guildSf);
    const member = await discordGuild.members.fetch(memberRef);
    const targetChannel = await discordGuild.channels.fetch(targetChannelRef);

    if (!targetChannel || !targetChannel.isTextBased()) {
      throw new InternalError('INTERNAL_SERVER_ERROR', 'Invalid channel');
    }

    const targetChannelSecure = await this.discordService.isChannelPrivate(targetChannel);
    const srcCrews = await this.query()
      .byGuild(guildRef)
      .withTeam()
      .withMembers()
      .withTickets()
      .withSettings()
      .withoutPending()
      .getMany();
    const crews = [];

    for (const crew of srcCrews) {
      const { [CrewSettingName.CREW_OPSEC]: opsecFlag } = crew.getConfig();
      let crewChannel: GuildBasedChannel;
      try {
        crewChannel = await discordGuild.channels.fetch(crew.crewSf);
      } catch {
        this.logger.warn(`Failed to resolve crew channel for ${crew.name} in ${crew.guild.name}`);
        continue;
      }

      if (
        !crewChannel.permissionsFor(member).has(PermissionsBitField.Flags.ViewChannel) ||
        (opsecFlag && opsecFlag.asBoolean() && !targetChannelSecure)
      ) {
        continue;
      }

      crews.push(crew);
    }

    const prompt = new CrewStatusPromptBuilder().addGlobalCrewStatus(discordGuild, crews);
    await targetChannel.send(prompt.build());
  }

  async getOrCreateDefaultCrewAccessRule(crew: Crew) {
    if (!crew) {
      throw new InternalError('INTERNAL_SERVER_ERROR', 'Invalid crew');
    }

    let entry = await this.accessService
      .query()
      .byGuild({ id: crew.guildId })
      .byCrew({ id: crew.id })
      .getOne();

    if (entry) {
      return entry;
    }

    const result = await this.accessService.createRule({
      guildId: crew.guildId,
      description: `Allow ${crew.name} member`,
      type: AccessRuleType.PERMIT,
      rule: {
        mode: AccessRuleMode.ANY,
        spec: [
          {
            crew: { id: crew.id },
          },
          {
            guildAdmin: true,
          },
        ],
      },
      updatedBy: this.client.user.id,
    });

    if (result?.identifiers) {
      const [{ id }] = result.identifiers as SelectAccessEntryDto[];
      return await this.accessService
        .query()
        .byGuild({ id: crew.guildId })
        .byEntry({ id })
        .getOneOrFail();
    } else {
      this.logger.warn(
        `Failed to create default rule for crew ${crew.name} in ${crew.guild.name}`,
        { result },
      );
    }
  }
}
