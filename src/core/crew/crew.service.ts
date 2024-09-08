import { Inject, Injectable, Logger, forwardRef } from '@nestjs/common';
import { DeepPartial, UpdateResult } from 'typeorm';
import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  CategoryChannel,
  ChannelType,
  EmbedBuilder,
  GuildBasedChannel,
  GuildManager,
  GuildMember,
  GuildTextBasedChannel,
  PermissionsBitField,
  Snowflake,
  channelMention,
  messageLink,
  userMention,
} from 'discord.js';
import { toSlug } from 'src/util';
import { DatabaseError, ExternalError, InternalError, ValidationError } from 'src/errors';
import { DiscordService } from 'src/bot/discord.service';
import { TeamService } from 'src/core/team/team.service';
import { TeamRepository } from 'src/core/team/team.repository';
import { TagService, TicketTag } from 'src/core/tag/tag.service';
import { TagTemplateRepository } from 'src/core/tag/tag-template.repository';
import { Ticket } from 'src/core/ticket/ticket.entity';
import { TicketService } from 'src/core/ticket/ticket.service';
import { TicketRepository } from 'src/core/ticket/ticket.repository';
import { ArchiveCrew, Crew, InsertCrew, SelectCrew } from './crew.entity';
import { CrewRepository } from './crew.repository';
import { CrewMemberAccess } from './member/crew-member.entity';
import { CrewMemberRepository } from './member/crew-member.repository';
import { CrewMemberService } from './member/crew-member.service';
import { crewAuditPrompt, newCrewMessage } from './crew.messages';

export abstract class CrewService {
  abstract getCrew(crewRef: SelectCrew): Promise<Crew>;
  abstract registerCrew(
    categoryRef: Snowflake,
    memberRef: Snowflake,
    data: InsertCrew,
  ): Promise<Crew>;
  abstract deregisterCrew(
    channelRef: Snowflake,
    memberRef: Snowflake,
    options?: ArchiveCrew,
  ): Promise<Crew | undefined>;
  abstract updateCrew(
    channelRef: Snowflake,
    update: DeepPartial<Pick<Crew, 'movePrompt' | 'permanent'>>,
  ): Promise<UpdateResult>;
  abstract sendIndividualStatus(
    channel: GuildTextBasedChannel,
    member: GuildMember,
    crew: Crew,
  ): Promise<void>;
  abstract sendAllStatus(channel: GuildTextBasedChannel, member: GuildMember): Promise<void>;
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
    private readonly teamRepo: TeamRepository,
    private readonly tagService: TagService,
    private readonly templateRepo: TagTemplateRepository,
    @Inject(forwardRef(() => TicketService)) private readonly ticketService: TicketService,
    private readonly ticketRepo: TicketRepository,
    private readonly crewRepo: CrewRepository,
    private readonly memberService: CrewMemberService,
  ) {
    super();
  }

  async getCrew(crewRef: SelectCrew) {
    return this.crewRepo.findOneOrFail({ where: crewRef });
  }

  async registerCrew(categoryRef: Snowflake, memberRef: Snowflake, data: InsertCrew) {
    const team = await this.teamRepo.findOneOrFail({ where: { category: categoryRef } });
    const discordGuild = await this.guildManager.fetch(team.guild);
    const category = await discordGuild.channels.fetch(team.category);

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
      await this.templateRepo.exists({ where: { guild: discordGuild.id, name: data.shortName } })
    ) {
      throw new ValidationError(
        'VALIDATION_FAILED',
        `A forum tag named _${data.shortName}_ already exists for this guild. Please choose something else.`,
      ).asDisplayable();
    }

    const role = await this.discordService.ensureRole(team.guild, data.role, {
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

    const denyEveryone = {
      id: discordGuild.roles.everyone.id,
      deny: [PermissionsBitField.Flags.ViewChannel],
    };
    const permissionOverwrites = [];

    if (team.parent?.config?.crewViewerRole) {
      if (!permissionOverwrites.length) {
        permissionOverwrites.push(denyEveryone);
      }

      permissionOverwrites.push({
        id: team.parent.config.crewViewerRole,
        allow: [PermissionsBitField.Flags.ViewChannel],
      });
    }

    if (team.parent?.config?.crewCreatorRole) {
      if (!permissionOverwrites.length) {
        permissionOverwrites.push(denyEveryone);
      }

      permissionOverwrites.push({
        id: team.parent.config.crewCreatorRole,
        allow: [PermissionsBitField.Flags.ViewChannel],
      });
    }

    const channel = await this.discordService.ensureChannel(team.guild, data.channel, {
      name: `${prefix}c-${data.slug}`,
      parent: team.category,
      type: ChannelType.GuildText,
      permissionOverwrites,
    });

    if (!data.movePrompt && data.movePrompt !== false) {
      data.movePrompt = false;
    }

    const crew = this.crewRepo.create(
      Object.assign(data, {
        channel: channel.id,
        guild: discordGuild.id,
        role: role.id,
        forum: team.forum,
        createdBy: memberRef,
      }),
    );

    try {
      await this.crewRepo.upsert(crew, ['guild', 'channel']);
      crew.team = team;
    } catch (err) {
      throw new DatabaseError('QUERY_FAILED', 'Failed to insert crew', err);
    }

    await this.tagService.createTagForCrew(crew);

    try {
      await this.memberService.registerCrewMember(channel.id, memberRef, CrewMemberAccess.OWNER);
    } catch (err) {
      this.logger.error(
        `Crew was created successfully but failed to register crew member: ${err.message}`,
        err.stack,
      );
    }

    if (channel.isTextBased()) {
      await this.crewJoinPrompt(crew, channel);
    }

    // Create audit prompt
    if (team.parent?.config?.crewAuditChannel) {
      try {
        const audit = await discordGuild.channels.fetch(team.parent.config.crewAuditChannel);

        if (audit.isTextBased()) {
          const embed = new EmbedBuilder()
            .setTitle(
              `New Crew: ${crew.name}` +
                (crew.name !== crew.shortName ? ` (${crew.shortName})` : ''),
            )
            .setDescription(crewAuditPrompt(crew))
            .setTimestamp()
            .setColor('DarkGold');

          const deleteButton = new ButtonBuilder()
            .setCustomId(`crew/reqdelete/${crew.channel}`)
            .setLabel('Delete')
            .setStyle(ButtonStyle.Danger);

          const row = new ActionRowBuilder<ButtonBuilder>().addComponents(deleteButton);

          await audit.send({ embeds: [embed], components: [row] });
        }
      } catch (err) {
        this.logger.error(
          `Failed to create audit prompt for crew ${crew.name}: ${err.message}`,
          err.stack,
        );
      }
    }

    return crew;
  }

  public async deregisterCrew(
    channelRef: Snowflake,
    memberRef: Snowflake,
    options: ArchiveCrew = {},
  ) {
    const crew = await this.crewRepo.findOneOrFail({ where: { channel: channelRef } });
    const discordGuild = await this.guildManager.fetch(crew.guild);

    // if (crewMember) {
    //   if (!crewMember.requireAccess(CrewMemberAccess.ADMIN, options)) {
    //     return new OperationStatus({
    //       success: false,
    //       message: 'Only crew members can perform this action',
    //     });
    //   } else if (options.isAdmin || options.skipAccessControl) {
    //     try {
    //       member = await guild.members.fetch(memberRef);
    //     } catch (e) {
    //       this.logger.error(`Failed to retrieve member for bot: ${e.message}`, e.stack);
    //       return new OperationStatus({
    //         success: false,
    //         message: 'Failed to deregister crew. Please report this issue',
    //       });
    //     }
    //   } else {
    //     member = await this.memberService.resolveGuildMember(crewMember);
    //   }
    // }

    // Close all currently open tickets
    let tickets: Ticket[];
    try {
      tickets = await this.ticketRepo.find({ where: { discussion: channelRef } });
    } catch (err) {
      throw new DatabaseError('QUERY_FAILED', 'Failed to fetch crew tickets', err);
    }

    const errors: Error[] = [];
    await Promise.all(
      tickets.map(async (ticket) => {
        try {
          const thread = await discordGuild.channels.fetch(ticket.thread);

          if (!thread || !thread.isThread()) {
            throw new InternalError('INTERNAL_SERVER_ERROR', 'Invalid thread');
          }

          const triageSnowflake = await crew.team.resolveSnowflakeFromTag(TicketTag.TRIAGE);

          if (thread.appliedTags.includes(triageSnowflake)) {
            return this.ticketService.updateTicket(
              { thread: ticket.thread, updatedBy: memberRef },
              TicketTag.ABANDONED,
            );
          } else {
            return this.ticketService.updateTicket(
              { thread: ticket.thread, updatedBy: memberRef },
              TicketTag.DONE,
            );
          }
        } catch (err) {
          errors.push(err);
        }
      }),
    );

    // TODO: finish refactor
    try {
      const tagTemplate = await this.templateRepo.findOneOrFail({
        where: { channel: crew.channel },
      });
      const botMember = await discordGuild.members.fetchMe();
      await this.tagService.deleteTags(botMember, [tagTemplate]);
      await this.tagService.deleteTagTemplates(botMember, [tagTemplate]);
    } catch (err) {
      this.logger.error(`Failed to update ticket tags: ${err.message}`, err.stack);
    }

    const discussion = await discordGuild.channels.fetch(crew.channel);

    if (!discussion || !discussion.isTextBased()) {
      throw new InternalError('INTERNAL_SERVER_ERROR', 'Invalid channel');
    }

    const role = await discordGuild.roles.fetch(crew.role);

    if (!role) {
      throw new InternalError('INTERNAL_SERVER_ERROR', 'Invalid role');
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
        await Promise.all([discussion.delete(), role.delete()]);
      } catch (err) {
        throw new ExternalError('DISCORD_API_ERROR', '');
      }
    }

    let result: UpdateResult;
    try {
      result = await this.crewRepo.updateReturning(
        { channel: channelRef },
        { deletedAt: new Date() },
      );
    } catch (err) {
      throw new DatabaseError('QUERY_FAILED', 'Failed to update (soft-delete) crew', err);
    }

    if (result?.affected) {
      this.logger.log(
        `${userMention(memberRef)} archived crew ${crew.name} (${crew.channel}) in ${discordGuild.name} (${discordGuild.id})`,
      );

      return (result?.raw as Crew[]).pop();
    }
  }

  public async updateCrew(
    channelRef: Snowflake,
    update: DeepPartial<Pick<Crew, 'movePrompt' | 'permanent'>>,
  ) {
    try {
      return await this.crewRepo.update({ channel: channelRef }, update);
    } catch (err) {
      throw new DatabaseError('QUERY_FAILED', 'Failed to update crew', err);
    }
  }

  public async sendIndividualStatus(
    channel: GuildTextBasedChannel,
    member: GuildMember,
    crew: Crew,
  ) {
    const guild = member.guild;

    if (!channel || !channel.isTextBased()) {
      throw new InternalError('INTERNAL_SERVER_ERROR', 'Invalid channel');
    }

    const fields: { name: string; value: string }[] = [];
    const members = await crew.members;
    const logs = await crew.logs;

    const owner = await members.find((member) => member.access === CrewMemberAccess.OWNER);
    const embed = new EmbedBuilder()
      .setTitle(`Crew: ${crew.name}`)
      .setColor('DarkGreen')
      .setThumbnail(guild.iconURL())
      .setTimestamp()
      .setDescription(
        `${channelMention(crew.channel)} is led by ${owner ? userMention(owner.member) : 'nobody'}.`,
      );

    fields.push({
      name: 'Members',
      value: members.map((member) => `- ${userMention(member.member)}`).join('\n'),
    });

    if (logs.length) {
      const { content, discussion: channel, message } = logs.pop();
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
      if (channel.id === crew.channel) {
        await channel.send({ embeds: [embed], components: [this.createCrewActions()] });
      } else {
        await channel.send({ embeds: [embed] });
      }
    } catch (err) {
      throw new ExternalError('DISCORD_API_ERROR', 'Failed to publish crew status', err);
    }
  }

  public async sendAllStatus(channel: GuildTextBasedChannel, member: GuildMember) {
    const guild = member.guild;

    if (!channel || !channel.isTextBased()) {
      throw new InternalError('INTERNAL_SERVER_ERROR', 'Invalid channel');
    }

    const fields: { name: string; value: string }[] = [];

    const crews = await this.crewRepo.find({ where: { guild: channel.guildId } });
    const accessibleCrews = crews.filter((crew) => {
      try {
        return member.permissionsIn(crew.channel).has(PermissionsBitField.Flags.ViewChannel);
      } catch (err) {
        this.logger.warn(
          `Failed to test channel permissions for crew ${crew.name}: ${err.message}`,
        );
        return false;
      }
    });

    for (const crew of accessibleCrews) {
      const members = await crew.members;
      const logs = await crew.logs;

      const owner = members.find((member) => member.access === CrewMemberAccess.OWNER);
      const description = `${channelMention(crew.channel)} is led by ${owner ? userMention(owner.member) : 'nobody'} and has ${members.length} ${members.length > 1 ? 'members' : 'member'}.`;

      if (logs.length) {
        const { content, discussion: channel, message } = logs.pop();
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
      .setThumbnail(guild.iconURL())
      .setTimestamp();

    if (fields.length) {
      embed.addFields(...fields);
    } else {
      embed.setDescription('No data');
    }

    try {
      await channel.send({ embeds: [embed] });
    } catch (err) {
      throw new ExternalError('DISCORD_API_ERROR', 'Failed to publish crew status', err);
    }
  }

  async crewJoinPrompt(crew: Crew, channel?: GuildTextBasedChannel) {
    if (!crew) {
      throw new InternalError('INTERNAL_SERVER_ERROR', 'Invalid crew');
    }

    const discordGuild = await this.guildManager.fetch(crew.guild);

    if (!channel) {
      const c = await discordGuild.channels.fetch(crew.channel);

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
      .setDescription(newCrewMessage(owner ? userMention(owner.member) : 'nobody'))
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
