import { Inject, Injectable, Logger, forwardRef } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DeepPartial, Equal, Repository } from 'typeorm';
import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  CategoryChannel,
  ChannelType,
  EmbedBuilder,
  Guild,
  GuildBasedChannel,
  GuildChannelResolvable,
  GuildMember,
  GuildTextBasedChannel,
  PermissionsBitField,
  Snowflake,
  channelMention,
  inlineCode,
  roleMention,
} from 'discord.js';
import { ConfigService } from 'src/config';
import { OperationStatus } from 'src/types';
import { collectResults, toSlug } from 'src/util';
import { TeamService } from 'src/bot/team/team.service';
import { TagService, TicketTag } from 'src/bot/tag/tag.service';
import { TicketService } from 'src/bot/ticket/ticket.service';
import { CrewMember, CrewMemberAccess } from './crew-member.entity';
import { CrewLog } from './crew-log.entity';
import { Crew } from './crew.entity';
import { newCrewMessage } from './crew.messages';

@Injectable()
export class CrewService {
  private readonly logger = new Logger(CrewService.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly teamService: TeamService,
    private readonly tagService: TagService,
    @Inject(forwardRef(() => TicketService)) private readonly ticketService: TicketService,
    @InjectRepository(Crew) private readonly crewRepo: Repository<Crew>,
    @InjectRepository(CrewMember) private readonly memberRepo: Repository<CrewMember>,
    @InjectRepository(CrewLog) private readonly logRepo: Repository<CrewLog>,
  ) {}

  async getCrew(channelRef: GuildChannelResolvable, options: { withDeleted?: boolean } = {}) {
    return this.crewRepo.findOne({
      where: { channel: typeof channelRef === 'string' ? channelRef : channelRef.id },
      ...options,
    });
  }

  async getFirstCrew(guild: Guild) {
    return this.crewRepo.findOne({
      where: { guild: guild.id, movePrompt: true },
    });
  }

  async getCrews(guild: Guild) {
    return this.crewRepo.find({ where: { guild: guild.id } });
  }

  async searchCrew(guild: Guild, query: string) {
    return this.crewRepo
      .createQueryBuilder('crew')
      .where('guild_sf = :guild AND (name ILIKE :query OR name_short ILIKE :query)', {
        guild: guild.id,
        query: `%${query}%`,
      })
      .getMany();
  }

  async getCrewMember(channelRef: GuildChannelResolvable, member: GuildMember) {
    if (!channelRef) {
      return;
    }

    return this.memberRepo.findOne({
      where: {
        channel: typeof channelRef === 'string' ? channelRef : channelRef.id,
        member: member.id,
      },
    });
  }

  async crewJoinPrompt(channel: GuildTextBasedChannel, crew: Crew) {
    const embed = new EmbedBuilder()
      .setTitle(`Join ${crew.name}`)
      .setDescription(newCrewMessage())
      .setColor('DarkGreen');

    const join = new ButtonBuilder()
      .setCustomId('crew/join')
      .setLabel('Join Crew')
      .setStyle(ButtonStyle.Primary);

    const log = new ButtonBuilder()
      .setCustomId('crew/log')
      .setLabel('Log')
      .setStyle(ButtonStyle.Secondary);

    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(join, log);

    const message = await channel.send({ embeds: [embed], components: [row] });
    await message.pin();
  }

  async registerCrew(
    categoryRef: GuildChannelResolvable,
    member: GuildMember,
    name?: string,
    shortName?: string,
    movePrompt = false,
  ): Promise<OperationStatus> {
    const guild = member.guild;
    const category = await guild.channels.cache.get(
      typeof categoryRef === 'string' ? categoryRef : categoryRef.id,
    );

    if (!category) {
      return { success: false, message: 'Invalid channel' };
    }

    const team = await this.teamService.getTeam(categoryRef);

    if (!team) {
      return { success: false, message: `${category} does not belong to a registered team` };
    }

    name = name || category.name;
    shortName = shortName || name;
    const slug = toSlug(name);

    if (shortName.length > 20) {
      return {
        success: false,
        message:
          'Your name is too long to create a tag. Please try again with a `short_name` in your command that is under 20 characters.',
      };
    }

    const knownTags = Object.values(TicketTag).map((t) => t.toLowerCase());
    if (knownTags.includes(name.toLowerCase()) || knownTags.includes(shortName.toLowerCase())) {
      return {
        success: false,
        message: `${shortName} is a reserved name. Please choose something else`,
      };
    }

    if (await this.tagService.existsTemplate(guild, shortName)) {
      return {
        success: false,
        message: `Tag named ${shortName} already exists for this guild. Please choose a different ${inlineCode('name')} or a unique ${inlineCode('short_name')}.`,
      };
    }

    const role = await member.guild.roles.create({
      name,
      mentionable: true,
    });

    const channel = await member.guild.channels.create({
      name: `🟢${slug}`,
      parent: category.id,
      type: ChannelType.GuildText,
      permissionOverwrites: [
        { id: guild.id, deny: [PermissionsBitField.Flags.ViewChannel] },
        { id: team.role, allow: [PermissionsBitField.Flags.ViewChannel] },
      ],
    });

    if (!movePrompt && movePrompt !== false) {
      movePrompt = false;
    }

    await this.crewRepo.insert({
      channel: channel.id,
      guild: member.guild.id,
      name,
      shortName,
      slug,
      movePrompt,
      role: role.id,
      forum: team.forum,
      createdBy: member.id,
    });

    const crew = await this.getCrew(channel.id);
    await this.crewJoinPrompt(channel, crew);

    const result = await this.tagService.createTagForCrew(crew);

    if (!result.success) {
      return result;
    }

    // Create audit prompt
    if (crew?.team?.audit) {
      const audit = await guild.channels.fetch(crew.team.audit);

      if (audit.isTextBased()) {
        const embed = new EmbedBuilder()
          .setTitle(
            `New Crew: ${crew.name}` + (crew.name !== crew.shortName ? ` (${crew.shortName})` : ''),
          )
          .setDescription(
            `A new crew called **${crew.name}** was created under ${crew.team.name} by ${member}. This prompt can be used to remove the team if there is something wrong.`,
          )
          .setTimestamp()
          .setColor('DarkGold');

        const deleteButton = new ButtonBuilder()
          .setCustomId(`crew/reqdelete/${crew.channel}`)
          .setLabel('Delete')
          .setStyle(ButtonStyle.Danger);

        const row = new ActionRowBuilder<ButtonBuilder>().addComponents(deleteButton);

        await audit.send({ embeds: [embed], components: [row] });
      }
    }

    return await this.registerCrewMember(channel, member, CrewMemberAccess.OWNER);
  }

  async registerCrewMember(
    channelRef: GuildChannelResolvable,
    member: GuildMember,
    access: CrewMemberAccess = CrewMemberAccess.MEMBER,
  ): Promise<OperationStatus> {
    const channel = await member.guild.channels.cache.get(
      typeof channelRef === 'string' ? channelRef : channelRef.id,
    );

    if (!channel) {
      return { success: false, message: 'Invalid channel' };
    }

    const crew = await this.getCrew(channel);

    if (!crew) {
      return { success: false, message: `${channel} does not belong to a crew` };
    }

    const crewMember = await this.getCrewMember(channel, member);
    if (crewMember) {
      // If the user would get more privileges then update the existing record instead
      if (access < crewMember.access) {
        return this.updateCrewMember(channel, member, { access });
      }

      // Otherwise prevent an accidental loss of privilege
      return {
        success: false,
        message: `You are already a ${crewMember.access > CrewMemberAccess.MEMBER ? 'subscriber' : 'member'} of ${roleMention(crew.role)}`,
      };
    }

    await this.memberRepo.insert({
      member: member.id,
      guild: member.guild.id,
      name: member.displayName,
      icon:
        member.avatarURL({ extension: 'png', forceStatic: true }) ??
        member.user.avatarURL({ extension: 'png', forceStatic: true }),
      access,
      channel: channel.id,
    });

    await member.roles.add(crew.role);

    return { success: true, message: 'Done' };
  }

  async updateCrewMember(
    channelRef: GuildChannelResolvable,
    member: GuildMember,
    data: DeepPartial<CrewMember>,
  ) {
    const channel = await member.guild.channels.cache.get(
      typeof channelRef === 'string' ? channelRef : channelRef.id,
    );

    if (!channel) {
      return { success: false, message: 'Invalid channel' };
    }

    const crew = await this.getCrew(channel);

    if (!crew) {
      return { success: false, message: `${channel} does not belong to a crew` };
    }

    const result = await this.memberRepo.update(
      { channel: Equal(crew.channel), member: Equal(member.id) },
      data,
    );

    if (result.affected) {
      return { success: true, message: 'Done' };
    }

    return { success: false, message: `${member.displayName} is not a member of this team` };
  }

  async removeCrewMember(
    channelRef: GuildChannelResolvable,
    member: GuildMember,
  ): Promise<OperationStatus> {
    const channel = await member.guild.channels.cache.get(
      typeof channelRef === 'string' ? channelRef : channelRef.id,
    );

    if (!channel) {
      return { success: false, message: 'Invalid channel' };
    }

    const crew = await this.getCrew(channel);

    if (!crew) {
      return { success: false, message: `${channel} does not belong to a crew` };
    }

    const crewMember = await this.getCrewMember(channel, member);

    if (!crewMember) {
      return { success: false, message: 'Not a member of this crew' };
    }

    await member.roles.remove(crew.role);
    await this.memberRepo.delete({ member: member.id, channel: channel.id });

    return { success: true, message: 'Done' };
  }

  public async deregisterCrew(
    channelRef: GuildChannelResolvable,
    member: GuildMember,
    force: boolean = false,
    archiveTargetRef?: GuildChannelResolvable,
    archiveTag?: string,
  ): Promise<OperationStatus<string>> {
    const guild = member.guild;
    const channel = await guild.channels.fetch(
      typeof channelRef === 'string' ? channelRef : channelRef.id,
    );

    if (!channel) {
      return { success: false, message: 'Invalid channel' };
    }

    const crew = await this.getCrew(channel);

    if (!crew) {
      return { success: false, message: `${channel} does not belong to a crew` };
    }

    const role = guild.roles.cache.get(crew.role);

    const crewMember = await this.getCrewMember(channel, member);

    if (!force && !crewMember) {
      return { success: false, message: 'Not a member of this crew' };
    }

    if (!force && crewMember.access > CrewMemberAccess.ADMIN) {
      return { success: false, message: 'Only an administrator can perform this action' };
    }

    const discussion = (await guild.channels.fetch(crew.channel)) as GuildTextBasedChannel;

    const tickets = await this.ticketService.getOpenTickets(discussion);

    const ticketResults = collectResults(
      await Promise.all(
        tickets.map(async (ticket) => {
          const thread = await guild.channels.fetch(ticket.thread);

          if (!thread.isThread()) {
            return {
              success: false,
              message: `${ticket.name} has an invalid thread. Please report this incident`,
            };
          }

          const triageSnowflake = await crew.team.resolveSnowflakeFromTag(TicketTag.TRIAGE);

          if (thread.appliedTags.includes(triageSnowflake)) {
            return this.ticketService.updateTicket(thread, member, TicketTag.ABANDONED);
          } else {
            return this.ticketService.updateTicket(thread, member, TicketTag.DONE);
          }
        }),
      ),
    );

    if (!ticketResults.success) {
      return ticketResults;
    }

    const tagTemplate = await this.tagService.getTemplateForCrew(crew.channel);
    const botMember = await guild.members.fetchMe();
    await this.tagService.deleteTags(botMember, [tagTemplate]);
    await this.tagService.deleteTagTemplates(botMember, [tagTemplate]);

    const reason = `Team archived by ${member.displayName}`;

    if (archiveTargetRef) {
      const archiveTargetCategory = await guild.channels.fetch(
        typeof archiveTargetRef === 'string' ? archiveTargetRef : archiveTargetRef.id,
      );

      if (archiveTargetCategory) {
        await Promise.all([
          discussion.edit({
            name: archiveTag
              ? [discussion.name, archiveTag.toLowerCase()].join('-')
              : discussion.name,
            permissionOverwrites: [{ id: guild.id, deny: [PermissionsBitField.Flags.ViewChannel] }],
            parent: archiveTargetCategory as CategoryChannel,
          }),
          role.delete(reason),
        ]);
      } else {
        return { success: false, message: 'Failed to archive channel. Please report this issue.' };
      }
    } else {
      await Promise.all([discussion.delete(reason), role.delete(reason)]);
    }

    await this.crewRepo.softDelete({ channel: channel.id });

    this.logger.log(
      `${member.displayName} archived crew ${crew.name} (${crew.channel}) in ${guild.name} (${guild.id})`,
    );

    return { success: true, message: 'Done', data: crew.name };
  }

  public async updateCrew(
    channelRef: GuildChannelResolvable,
    member: GuildMember,
    options: DeepPartial<Pick<Crew, 'movePrompt' | 'permanent'>>,
  ) {
    const guild = member.guild;
    const channel = await guild.channels.cache.get(
      typeof channelRef === 'string' ? channelRef : channelRef.id,
    );

    if (!channel) {
      return { success: false, message: 'Invalid channel' };
    }

    const crew = await this.getCrew(channel);

    if (!crew) {
      return { success: false, message: `${channel} does not belong to a crew` };
    }

    const crewMember = await this.getCrewMember(channel, member);

    if (!crewMember) {
      return { success: false, message: 'Not a member of this crew' };
    }

    if (crewMember.access > CrewMemberAccess.ADMIN) {
      return { success: false, message: 'Only an administrator can perform this action' };
    }

    await this.crewRepo.update({ channel: channel.id }, options);

    return { success: true, message: 'Done' };
  }

  public async sendStatus(
    channel: GuildBasedChannel,
    member: GuildMember,
  ): Promise<OperationStatus> {
    const guild = member.guild;

    if (!channel || !channel.isTextBased()) {
      return { success: false, message: 'Invalid channel' };
    }

    const crews = await this.getCrews(guild);
    const accessibleCrews = crews.filter((crew) =>
      member.permissionsIn(crew.channel).has(PermissionsBitField.Flags.ViewChannel),
    );

    const embed = new EmbedBuilder()
      .setTitle('Crew Status')
      .setColor('DarkGreen')
      .setThumbnail(guild.iconURL())
      .setTimestamp();

    const crewSummary: string[] = [];
    for (const crew of accessibleCrews) {
      const members = await crew.members;
      const tickets = await crew.tickets;

      crewSummary.push(
        `- ${channelMention(crew.channel)} (${members.length} members / ${tickets.length} tickets)`,
      );

      for (const ticket of tickets) {
        crewSummary.push(`  - ${channelMention(ticket.thread)}`);
      }
    }

    embed.setDescription(crewSummary.join('\n'));

    await channel.send({ embeds: [embed] });

    return { success: true, message: 'Done' };
  }

  async getLastCrewLog(
    channelRef: GuildChannelResolvable,
    options: { withDeleted?: boolean } = {},
  ) {
    return this.logRepo.findOne({
      where: { discussion: typeof channelRef === 'string' ? channelRef : channelRef.id },
      order: { createdAt: 'desc' },
      ...options,
    });
  }

  async getCrewLogs(channelRef: GuildChannelResolvable, options: { withDeleted?: boolean } = {}) {
    return this.logRepo.find({
      where: { discussion: typeof channelRef === 'string' ? channelRef : channelRef.id },
      ...options,
    });
  }

  async addCrewLog(
    channelRef: GuildChannelResolvable,
    member: GuildMember,
    content: string,
  ): Promise<OperationStatus> {
    const guild = member.guild;
    const channel = await guild.channels.fetch(
      typeof channelRef === 'string' ? channelRef : channelRef.id,
    );

    if (!channel || !channel.isTextBased()) {
      return { success: false, message: 'Invalid channel' };
    }

    const crew = await this.getCrew(channel);

    if (!crew) {
      return { success: false, message: `${channel} does not belong to a crew` };
    }

    const crewMember = await this.getCrewMember(channel, member);

    if (
      (!crewMember || crewMember.access > CrewMemberAccess.MEMBER) &&
      !member.permissions.has(PermissionsBitField.Flags.Administrator)
    ) {
      return { success: false, message: 'Not a member of this crew' };
    }

    const createdAt = new Date();
    const embed = new EmbedBuilder()
      .setTitle('Crew Update')
      .setColor('DarkGreen')
      .setThumbnail(member.avatarURL() ?? member.user.avatarURL())
      .setDescription(content)
      .setTimestamp(createdAt);

    const message = await channel.send({
      content: roleMention(crew.role),
      embeds: [embed],
      allowedMentions: { roles: [crew.role] },
    });

    await message.pin();

    await this.logRepo.insert({
      guild: member.guild.id,
      message: message.id,
      discussion: crew.channel,
      content,
      createdAt,
      createdBy: member.id,
    });

    return { success: true, message: 'Done' };
  }
}
