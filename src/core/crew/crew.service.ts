import { Inject, Injectable, Logger, forwardRef } from '@nestjs/common';
import { EntityNotFoundError, Equal, IsNull, UpdateResult } from 'typeorm';
import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  CategoryChannel,
  ChannelType,
  DiscordAPIError,
  EmbedBuilder,
  GuildManager,
  GuildTextBasedChannel,
  OverwriteResolvable,
  PermissionsBitField,
  Snowflake,
  channelMention,
  messageLink,
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
import { CrewMemberAccess } from 'src/types';
import { DiscordService } from 'src/bot/discord.service';
import { SelectGuild } from 'src/core/guild/guild.entity';
import { TeamService } from 'src/core/team/team.service';
import { SelectTeam } from 'src/core/team/team.entity';
import { TagService, TicketTag } from 'src/core/tag/tag.service';
import { TagTemplateRepository } from 'src/core/tag/tag-template.repository';
import { Ticket } from 'src/core/ticket/ticket.entity';
import { TicketService } from 'src/core/ticket/ticket.service';
import { TicketRepository } from 'src/core/ticket/ticket.repository';
import { ArchiveCrew, Crew, InsertCrew, SelectCrew, UpdateCrew } from './crew.entity';
import { CrewRepository } from './crew.repository';
import { CrewMemberService } from './member/crew-member.service';
import { crewAuditPrompt, newCrewMessage } from './crew.messages';

type RegisterCrewOptions = Partial<{
  createVoice: boolean;
}>;

export abstract class CrewService {
  abstract getCrew(crewRef: SelectCrew): Promise<Crew>;
  abstract getCrew(crewRef: SelectCrew, withDeleted: boolean): Promise<Crew>;
  abstract getCrewByRole(roleRef: Snowflake): Promise<Crew>;
  abstract getMemberCrews(guildRef: SelectGuild, memberRef: Snowflake): Promise<Crew[]>;
  abstract registerCrew(data: InsertCrew, options?: RegisterCrewOptions): Promise<Crew>;
  abstract deregisterCrew(
    channelRef: Snowflake,
    memberRef: Snowflake,
    options?: ArchiveCrew,
  ): Promise<Crew | undefined>;
  abstract updateCrew(channelRef: Snowflake, update: UpdateCrew): Promise<UpdateResult>;
  abstract sendIndividualStatus(
    crewRef: SelectCrew,
    targetChannelRef: Snowflake,
    memberRef: Snowflake,
  ): Promise<void>;
  abstract sendAllStatus(
    guildRef: SelectGuild,
    targetChannelRef: Snowflake,
    memberRef: Snowflake,
  ): Promise<void>;
  abstract crewJoinPrompt(crew: Crew, channel?: GuildTextBasedChannel): Promise<void>;
  abstract createCrewActions(): ActionRowBuilder<ButtonBuilder>;
}

@Injectable()
export class CrewServiceImpl extends CrewService {
  private readonly logger = new Logger(CrewService.name);

  constructor(
    private readonly guildManager: GuildManager,
    private readonly discordService: DiscordService,
    private readonly teamService: TeamService,
    private readonly tagService: TagService,
    private readonly templateRepo: TagTemplateRepository,
    @Inject(forwardRef(() => TicketService)) private readonly ticketService: TicketService,
    private readonly ticketRepo: TicketRepository,
    private readonly crewRepo: CrewRepository,
    private readonly memberService: CrewMemberService,
  ) {
    super();
  }

  async getCrew(crewRef: SelectCrew, withDeleted: boolean = false) {
    try {
      return await this.crewRepo.findOneOrFail({ where: crewRef, withDeleted });
    } catch (err) {
      if (err instanceof EntityNotFoundError) {
        throw new ValidationError(
          'VALIDATION_FAILED',
          'Please select a crew, or run the command inside the relevant crew channel.',
          [err],
        ).asDisplayable();
      }

      throw err;
    }
  }

  async getCrewByRole(roleRef: Snowflake) {
    return await this.crewRepo.findOneOrFail({ where: { roleSf: roleRef } });
  }

  async getMemberCrews(guildRef: SelectGuild, memberRef: Snowflake) {
    const guildWhere = guildRef.id
      ? { guildId: Equal(guildRef.id) }
      : { guild: { guildSf: Equal(guildRef.guildSf) } };
    return await this.crewRepo.findBy({
      ...guildWhere,
      deletedAt: IsNull(),
      members: { memberSf: Equal(memberRef), deletedAt: IsNull() },
    });
  }

  async registerCrew(data: InsertCrew, options: RegisterCrewOptions = {}) {
    const teamRef: SelectTeam = { id: data.teamId };
    const team = await this.teamService.getTeam(teamRef);
    const discordGuild = await this.guildManager.fetch(team.guild.guildSf);
    const category = await discordGuild.channels.fetch(team.categorySf);

    if (!category) {
      throw new InternalError('INTERNAL_SERVER_ERROR', 'Failed to resolve team category channel');
    }

    data.name = data.name || category.name;
    data.shortName = data.shortName || data.name;
    data.slug = data.slug || toSlug(data.name);

    if (data.shortName.length > 20) {
      throw new ValidationError(
        'VALIDATION_FAILED',
        'Your name is too long to create a tag. Please try again with a `short_name` in your command that is under 20 characters.',
      ).asDisplayable();
    }

    const knownTags = Object.values(TicketTag).map((t) => t.toLowerCase());
    if (knownTags.includes(data.shortName.toLowerCase())) {
      throw new ValidationError(
        'VALIDATION_FAILED',
        `_${data.shortName}_ is a reserved name. Please choose something else.`,
      ).asDisplayable();
    }

    const usedRoles = await discordGuild.roles.fetch();
    if (usedRoles.find((role) => role.name.toLowerCase() === data.shortName.toLowerCase())) {
      throw new ValidationError(
        'VALIDATION_FAILED',
        `A role with the name _${data.shortName}_ already exists. Please choose something else.`,
      ).asDisplayable();
    }

    if (
      await this.templateRepo.exists({
        where: { guild: { guildSf: discordGuild.id }, name: data.shortName },
      })
    ) {
      throw new ValidationError(
        'VALIDATION_FAILED',
        `A forum tag named _${data.shortName}_ already exists for this guild. Please choose something else.`,
      ).asDisplayable();
    }

    const role = await this.discordService.ensureRole(team.guild.guildSf, data.roleSf, {
      name: data.shortName,
    });

    const prefixes = {
      Colonial: '🟢',
      Warden: '🔵',
    };

    let prefix = '';
    for (const [search, value] of Object.entries(prefixes)) {
      if (category.name.toLowerCase().startsWith(search.toLowerCase())) {
        prefix = value;
        break;
      }
    }

    const permissionOverwrites: OverwriteResolvable[] = [
      {
        id: discordGuild.roles.everyone.id,
        deny: [PermissionsBitField.Flags.ViewChannel],
      },
    ];

    const botMember = await discordGuild.members.fetchMe();
    const botRole = discordGuild.roles.botRoleFor(botMember);
    if (botRole) {
      permissionOverwrites.push({
        id: botRole.id,
        allow: [PermissionsBitField.Flags.ViewChannel],
      });
    }

    if (team.guild?.config?.crewViewerRole) {
      permissionOverwrites.push({
        id: team.guild.config.crewViewerRole,
        allow: [PermissionsBitField.Flags.ViewChannel],
      });
    }

    if (team.guild?.config?.crewCreatorRole) {
      permissionOverwrites.push({
        id: team.guild.config.crewCreatorRole,
        allow: [PermissionsBitField.Flags.ViewChannel],
      });
    }

    const channel = await this.discordService.ensureChannel(team.guild.guildSf, data.crewSf, {
      name: `${prefix}c-${data.slug}`,
      parent: team.categorySf,
      type: ChannelType.GuildText,
      permissionOverwrites,
    });

    if (!data.hasMovePrompt && data.hasMovePrompt !== false) {
      data.hasMovePrompt = false;
    }

    const crew = this.crewRepo.create(
      Object.assign(data, {
        crewSf: channel.id,
        guildId: team.guildId,
        roleSf: role.id,
        teamId: team.id,
      }),
    );

    if (options.createVoice) {
      const parent = team.guild.config.globalVoiceCategory
        ? team.guild.config.globalVoiceCategory
        : team.categorySf;
      const voiceChannel = await this.discordService.ensureChannel(
        team.guild.guildSf,
        data.voiceSf,
        {
          name: `${prefix}c-${data.slug}`,
          parent,
          type: ChannelType.GuildVoice,
          permissionOverwrites,
        },
      );
      crew.voiceSf = voiceChannel.id;
    }

    // Create audit prompt
    this.logger.debug(JSON.stringify(crew), JSON.stringify(team.guild));
    if (team.guild?.config?.crewAuditChannel) {
      try {
        const audit = await discordGuild.channels.fetch(team.guild.config.crewAuditChannel);

        if (audit.isTextBased()) {
          const embed = new EmbedBuilder()
            .setTitle(
              `New Crew: ${crew.name}` +
                (crew.name !== crew.shortName ? ` (${crew.shortName})` : ''),
            )
            .setDescription(crewAuditPrompt(crew, team))
            .setTimestamp()
            .setColor('DarkGold');

          const deleteButton = new ButtonBuilder()
            .setCustomId(`crew/reqdelete/${crew.crewSf}`)
            .setLabel('Delete')
            .setStyle(ButtonStyle.Danger);

          const row = new ActionRowBuilder<ButtonBuilder>().addComponents(deleteButton);
          const message = await audit.send({ embeds: [embed], components: [row] });
          crew.auditMessageSf = message.id;
        }
      } catch (err) {
        this.logger.error(
          `Failed to create audit prompt for crew ${crew.name}: ${err.message}`,
          err.stack,
        );
      }
    }

    await this.crewRepo.insert(crew);
    // await this.crewRepo.upsert(crew, ['guildId', 'crewSf', 'deletedAt']);
    crew.team = team;

    await this.tagService.createTagForCrew(crew);

    try {
      await this.memberService.registerCrewMember(
        channel.id,
        crew.createdBy,
        CrewMemberAccess.OWNER,
      );
    } catch (err) {
      this.logger.error(
        `Crew was created successfully but failed to register crew member: ${err.message}`,
        err.stack,
      );
    }

    if (channel.isTextBased()) {
      await this.crewJoinPrompt(crew, channel);
    }

    return crew;
  }

  public async deregisterCrew(
    channelRef: Snowflake,
    memberRef: Snowflake,
    options: ArchiveCrew = {},
  ) {
    const crew = await this.crewRepo.findOneOrFail({ where: { crewSf: channelRef } });
    const discordGuild = await this.guildManager.fetch(crew.guild.guildSf);

    // Close all currently open tickets
    let tickets: Ticket[];
    try {
      tickets = await this.ticketRepo.find({ where: { crewSf: channelRef } });
    } catch (err) {
      throw new DatabaseError('QUERY_FAILED', 'Failed to fetch crew tickets', err);
    }

    const errors: Error[] = [];
    await Promise.all(
      tickets.map(async (ticket) => {
        try {
          const thread = await discordGuild.channels.fetch(ticket.threadSf);

          if (!thread || !thread.isThread()) {
            throw new InternalError('INTERNAL_SERVER_ERROR', 'Invalid thread');
          }

          const triageSnowflake = await crew.team.resolveSnowflakeFromTag(TicketTag.TRIAGE);

          if (thread.appliedTags.includes(triageSnowflake)) {
            return this.ticketService.updateTicket(
              { threadSf: ticket.threadSf, updatedBy: memberRef },
              TicketTag.ABANDONED,
            );
          } else {
            return this.ticketService.updateTicket(
              { threadSf: ticket.threadSf, updatedBy: memberRef },
              TicketTag.DONE,
            );
          }
        } catch (err) {
          errors.push(err);
        }
      }),
    );

    try {
      const tagTemplate = await this.templateRepo.findOneOrFail({
        where: { crewSf: crew.crewSf },
      });
      const botMember = await discordGuild.members.fetchMe();
      await this.tagService.deleteTags(botMember, [tagTemplate]);
      await this.tagService.deleteTagTemplates(botMember, [tagTemplate]);
    } catch (err) {
      this.logger.error(`Failed to update ticket tags: ${err.message}`, err.stack);
    }

    const discussion = await discordGuild.channels.fetch(crew.crewSf);

    if (!discussion || !discussion.isTextBased()) {
      throw new InternalError('INTERNAL_SERVER_ERROR', 'Invalid channel');
    }

    const voice = crew.voiceSf && (await discordGuild.channels.fetch(crew.voiceSf));

    if (crew.voiceSf && !voice.isVoiceBased()) {
      throw new InternalError('INTERNAL_SERVER_ERROR', 'Invalid voice channel');
    }

    const role = await discordGuild.roles.fetch(crew.roleSf);

    if (!role) {
      throw new InternalError('INTERNAL_SERVER_ERROR', 'Invalid role');
    }

    const result = await this.crewRepo.updateReturning(
      { crewSf: channelRef },
      { deletedAt: new Date(), deletedBy: memberRef },
    );

    if (crew.guild?.config?.crewAuditChannel && crew.auditMessageSf) {
      const audit = await discordGuild.channels.fetch(crew.guild.config.crewAuditChannel);

      if (audit.isTextBased()) {
        try {
          await audit.messages.delete(crew.auditMessageSf);
        } catch (err) {
          if ((err as DiscordAPIError).code !== 10008) {
            // Unknown message
            throw err;
          }
        }
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
            discussion.edit({
              name: options.tag
                ? [discussion.name, options.tag.toLowerCase()].join('-')
                : discussion.name,
              permissionOverwrites: [
                { id: discordGuild.id, deny: [PermissionsBitField.Flags.ViewChannel] },
              ],
              parent: archiveTargetCategory as CategoryChannel,
            }),
            role.delete(),
            crew.voiceSf && voice.delete(),
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
        await Promise.all([discussion.delete(), role.delete(), crew.voiceSf && voice.delete()]);
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

  public async updateCrew(channelRef: Snowflake, update: UpdateCrew) {
    try {
      return await this.crewRepo.update({ crewSf: channelRef }, update);
    } catch (err) {
      throw new DatabaseError('QUERY_FAILED', 'Failed to update crew', err);
    }
  }

  public async sendIndividualStatus(
    crewRef: SelectCrew,
    targetChannelRef: Snowflake,
    memberRef: Snowflake,
  ) {
    const crew = await this.getCrew(crewRef);
    const discordGuild = await this.guildManager.fetch(crew.guild.guildSf);
    const crewChannel = await discordGuild.channels.fetch(crewRef.crewSf);

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

    if (crew.isSecureOnly && !(await this.discordService.isChannelPrivate(targetChannel))) {
      throw new AuthError('FORBIDDEN', 'This channel is not secure').asDisplayable();
    }

    const fields: { name: string; value: string }[] = [];
    const members = await crew.members;
    const logs = await crew.logs;

    const owner = await members.find((member) => member.access === CrewMemberAccess.OWNER);
    const embed = new EmbedBuilder()
      .setTitle(`Crew: ${crew.name}`)
      .setColor('DarkGreen')
      .setThumbnail(discordGuild.iconURL())
      .setTimestamp()
      .setDescription(
        `${channelMention(crewRef.crewSf)} is led by ${owner ? userMention(owner.memberSf) : 'nobody'}.`,
      );

    fields.push({
      name: 'Members',
      value: members.map((member) => `- ${userMention(member.memberSf)}`).join('\n') || 'None',
    });

    if (logs.length) {
      const { content, crewSf: channel, messageSf: message } = logs.pop();
      const redirectText = `See the full status here: ${messageLink(channel, message)}`;
      const value =
        content?.length > 400 ? `${content.substring(0, 400)}...\n\n${redirectText}` : content;

      if (value) {
        fields.push({
          name: 'Status',
          value,
        });
      }
    }

    embed.addFields(...fields);

    try {
      if (targetChannel.id === crew.crewSf) {
        await targetChannel.send({ embeds: [embed], components: [this.createCrewActions()] });
      } else {
        await targetChannel.send({ embeds: [embed] });
      }
    } catch (err) {
      throw new ExternalError('DISCORD_API_ERROR', 'Failed to publish crew status', err);
    }
  }

  public async sendAllStatus(
    guildRef: SelectGuild,
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
    const fields: { name: string; value: string }[] = [];

    const crews = await this.crewRepo.find({ where: { guild: guildRef } });
    for (const crew of crews) {
      const crewChannel = await discordGuild.channels.fetch(crew.crewSf);

      if (
        !crewChannel.permissionsFor(member).has(PermissionsBitField.Flags.ViewChannel) ||
        (crew.isSecureOnly && !targetChannelSecure)
      ) {
        continue;
      }

      const members = await crew.members;
      const logs = await crew.logs;

      const owner = members.find((member) => member.access === CrewMemberAccess.OWNER);
      const description = `${channelMention(crew.crewSf)} is led by ${owner ? userMention(owner.memberSf) : 'nobody'} and has ${members.length} ${members.length > 1 || !members.length ? 'members' : 'member'}.`;

      if (logs.length) {
        const { content, crewSf: channel, messageSf: message } = logs.pop();
        const redirectText = `See the full status here: ${messageLink(channel, message)}`;
        const value =
          content?.length > 400
            ? `${description}\n\n${content.substring(0, 400)}...\n\n${redirectText}`
            : `${description}\n\n${content}`;

        if (value) {
          fields.push({
            name: crew.name,
            value,
          });
        }
      }
    }

    const embed = new EmbedBuilder()
      .setTitle('Crew Status')
      .setColor('DarkGreen')
      .setThumbnail(discordGuild.iconURL())
      .setTimestamp();

    if (fields.length) {
      embed.addFields(...fields);
    } else {
      embed.setDescription('No data');
    }

    await targetChannel.send({ embeds: [embed] });
  }

  async crewJoinPrompt(crew: Crew, channel?: GuildTextBasedChannel) {
    if (!crew) {
      throw new InternalError('INTERNAL_SERVER_ERROR', 'Invalid crew');
    }

    const discordGuild = await this.guildManager.fetch(crew.team.guild.guildSf);

    if (!channel) {
      const c = await discordGuild.channels.fetch(crew.crewSf);

      if (!c || !c.isTextBased()) {
        throw new InternalError('INTERNAL_SERVER_ERROR', 'Invalid channel');
      }

      channel = c;
    }

    const members = await crew.members;
    const owner = await members.find((member) => member.access === CrewMemberAccess.OWNER);
    const embed = new EmbedBuilder()
      .setTitle(`Join ${crew.name}`)
      // TODO: refactor to use crew repo
      .setDescription(newCrewMessage(owner ? userMention(owner.memberSf) : 'nobody'))
      .setColor('DarkGreen');

    const message = await channel.send({ embeds: [embed], components: [this.createCrewActions()] });
    await message.pin();
  }

  createCrewActions() {
    const join = new ButtonBuilder()
      .setCustomId('crew/join')
      .setLabel('Join Crew')
      .setStyle(ButtonStyle.Primary);

    const log = new ButtonBuilder()
      .setCustomId('crew/log')
      .setLabel('Log')
      .setStyle(ButtonStyle.Secondary);

    return new ActionRowBuilder<ButtonBuilder>().addComponents(join, log);
  }
}
