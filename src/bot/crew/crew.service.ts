import { Inject, Injectable, Logger, forwardRef } from '@nestjs/common';
import { DeepPartial } from 'typeorm';
import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  CategoryChannel,
  ChannelType,
  EmbedBuilder,
  Guild,
  GuildManager,
  GuildMember,
  GuildTextBasedChannel,
  PermissionsBitField,
  Role,
  Snowflake,
  channelMention,
  inlineCode,
  roleMention,
  userMention,
} from 'discord.js';
import { ConfigService } from 'src/config';
import { ArchiveOptions, DeleteOptions } from 'src/types';
import { OperationStatus, toSlug } from 'src/util';
import { TeamService } from 'src/bot/team/team.service';
import { TeamRepository } from 'src/bot/team/team.repository';
import { TagService, TicketTag } from 'src/bot/tag/tag.service';
import { TagTemplateRepository } from 'src/bot/tag/tag-template.repository';
import { TicketService } from 'src/bot/ticket/ticket.service';
import { TicketRepository } from 'src/bot/ticket/ticket.repository';
import { Crew } from './crew.entity';
import { CrewRepository } from './crew.repository';
import { CrewMember, CrewMemberAccess } from './member/crew-member.entity';
import { CrewMemberRepository } from './member/crew-member.repository';
import { CrewMemberService } from './member/crew-member.service';
import { crewAuditPrompt, newCrewMessage } from './crew.messages';

@Injectable()
export class CrewService {
  private readonly logger = new Logger(CrewService.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly guildManager: GuildManager,
    private readonly teamService: TeamService,
    private readonly teamRepo: TeamRepository,
    private readonly tagService: TagService,
    private readonly templateRepo: TagTemplateRepository,
    @Inject(forwardRef(() => TicketService)) private readonly ticketService: TicketService,
    private readonly ticketRepo: TicketRepository,
    private readonly crewRepo: CrewRepository,
    private readonly memberService: CrewMemberService,
    private readonly memberRepo: CrewMemberRepository,
  ) {}

  async resolveCrewGuild(crew: Crew): Promise<OperationStatus<Guild>> {
    try {
      const guild = await this.guildManager.fetch(crew.parent.guild);

      if (guild) {
        return new OperationStatus({ success: true, message: 'Done', data: guild });
      }

      return new OperationStatus({
        success: false,
        message: `Failed to resolve guild ${guild.name}`,
      });
    } catch (err) {
      this.logger.error(`Failed to resolve guild: ${err.message}`, err.stack);
      return new OperationStatus({
        success: false,
        message: 'Guild is improperly registered. Please report this incident.',
      });
    }
  }

  async resolveCrewChannel(crew: Crew): Promise<OperationStatus<GuildTextBasedChannel>> {
    const { data: guild, ...guildResult } = await this.resolveCrewGuild(crew);

    if (!guildResult.success) {
      return guildResult;
    }

    try {
      const channel = await guild.channels.fetch(crew.channel);

      if (!channel) {
        return new OperationStatus({
          success: false,
          message: `Failed to resolve channel ${channelMention(crew.channel)}`,
        });
      }

      if (!channel.isTextBased()) {
        return new OperationStatus({
          success: false,
          message: `${channelMention(crew.channel)} is not a text channel`,
        });
      }

      return new OperationStatus({ success: true, message: 'Done', data: channel });
    } catch (err) {
      this.logger.error(`Failed to resolve guild: ${err.message}`, err.stack);
      return new OperationStatus({
        success: false,
        message: 'Guild is improperly registered. Please report this incident.',
      });
    }
  }

  async resolveCrewRole(crew: Crew): Promise<OperationStatus<Role>> {
    const { data: guild, ...guildResult } = await this.resolveCrewGuild(crew);

    if (!guildResult.success) {
      return guildResult;
    }

    try {
      const role = await guild.roles.fetch(crew.role);
      if (role) {
        return new OperationStatus({ success: true, message: 'Done', data: role });
      }
      return new OperationStatus({
        success: false,
        message: `Failed to resolve role ${roleMention(crew.role)}`,
      });
    } catch (err) {
      this.logger.error(`Failed to resolve guild: ${err.message}`, err.stack);
      return new OperationStatus({
        success: false,
        message: 'Guild is improperly registered. Please report this incident.',
      });
    }
  }

  async registerCrew(
    categoryRef: Snowflake,
    memberRef: Snowflake,
    data: DeepPartial<Pick<Crew, 'name' | 'shortName' | 'slug' | 'movePrompt' | 'permanent'>>,
  ): Promise<OperationStatus> {
    const team = await this.teamRepo.findOne({ where: { category: categoryRef } });

    if (!team) {
      return new OperationStatus({
        success: false,
        message: `${channelMention(categoryRef)} does not belong to a registered team`,
      });
    }

    const { data: guild, ...guildResult } = await this.teamService.resolveTeamGuild(team);

    if (!guildResult.success) {
      return guildResult;
    }

    const { data: category, ...categoryResult } = await this.teamService.resolveTeamCategory(team);

    if (!categoryResult.success) {
      return categoryResult;
    }

    data.name = data.name || category.name;
    data.shortName = data.shortName || data.name;
    data.slug = data.slug || toSlug(data.name);

    if (data.shortName.length > 20) {
      return new OperationStatus({
        success: false,
        message:
          'Your name is too long to create a tag. Please try again with a `short_name` in your command that is under 20 characters.',
      });
    }

    const usedRoles = await guild.roles.fetch();
    if (usedRoles.find((role) => role.name.toLowerCase() === data.name.toLowerCase())) {
      return new OperationStatus({
        success: false,
        message: `A role with the name _${data.name}_ already exists. Please choose something else`,
      });
    }

    const knownTags = Object.values(TicketTag).map((t) => t.toLowerCase());
    if (knownTags.includes(data.shortName.toLowerCase())) {
      return new OperationStatus({
        success: false,
        message: `${data.shortName} is a reserved name. Please choose something else`,
      });
    }

    if (await this.templateRepo.exists({ where: { guild: guild.id, name: data.shortName } })) {
      return new OperationStatus({
        success: false,
        message: `Tag named ${data.shortName} already exists for this guild. Please choose a different ${inlineCode('name')} or a unique ${inlineCode('short_name')}.`,
      });
    }

    const role = await guild.roles.create({
      name: data.name,
      mentionable: true,
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

    const channel = await guild.channels.create({
      name: `${prefix}c-${data.slug}`,
      parent: team.category,
      type: ChannelType.GuildText,
      permissionOverwrites: [
        { id: guild.roles.everyone.id, deny: [PermissionsBitField.Flags.ViewChannel] },
        { id: team.role, allow: [PermissionsBitField.Flags.ViewChannel] },
      ],
    });

    if (!data.movePrompt && data.movePrompt !== false) {
      data.movePrompt = false;
    }

    const crew = this.crewRepo.create(
      Object.assign(data, {
        channel: channel.id,
        guild: guild.id,
        role: role.id,
        forum: team.forum,
        createdBy: memberRef,
      }),
    );

    await this.crewRepo.insert(crew);
    crew.team = team;

    const tagResult = await this.tagService.createTagForCrew(crew);

    if (!tagResult.success) {
      return tagResult;
    }

    const registerResult = await this.memberService.registerCrewMember(
      crew,
      memberRef,
      CrewMemberAccess.OWNER,
    );

    if (!registerResult.success) {
      return new OperationStatus({
        success: false,
        message: `Crew was created successfully but failed to register crew member: ${registerResult.message}`,
      });
    }

    await this.crewJoinPrompt(crew, channel);

    // Create audit prompt
    if (team.audit) {
      try {
        const audit = await guild.channels.fetch(team.audit);

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

    return OperationStatus.SUCCESS;
  }

  public async deregisterCrew(
    channelRef: Snowflake,
    memberRef: Snowflake,
    options: Partial<DeleteOptions & ArchiveOptions>,
  ): Promise<OperationStatus> {
    const crew = await this.crewRepo.findOne({ where: { channel: channelRef } });

    if (!crew) {
      return new OperationStatus({ success: false, message: 'Invalid channel' });
    }

    const { data: guild, ...guildResult } = await this.resolveCrewGuild(crew);

    if (!guildResult.success) {
      return guildResult;
    }

    const crewMember = await this.memberRepo.findOne({
      where: { channel: channelRef, member: memberRef },
    });

    let member;

    if (crewMember) {
      if (!crewMember.requireAccess(CrewMemberAccess.ADMIN, options)) {
        return new OperationStatus({
          success: false,
          message: 'Only crew members can perform this action',
        });
      } else if (options.isAdmin || options.skipAccessControl) {
        try {
          member = await guild.members.fetch(memberRef);
        } catch (e) {
          this.logger.error(`Failed to retrieve member for bot: ${e.message}`, e.stack);
          return new OperationStatus({
            success: false,
            message: 'Failed to deregister crew. Please report this issue',
          });
        }
      } else {
        const { data, ...memberResult } = await this.memberService.resolveGuildMember(crewMember);

        if (!memberResult.success) {
          return memberResult;
        }

        member = data;
      }
    }

    // Close all currently open tickets
    const tickets = await this.ticketRepo.find({ where: { discussion: channelRef } });
    const ticketResults = OperationStatus.collect(
      await Promise.all(
        tickets.map(async (ticket) => {
          const { data: thread, ...threadResult } =
            await this.ticketService.resolveTicketThread(ticket);

          if (!threadResult.success) {
            return threadResult;
          }

          const triageSnowflake = await crew.team.resolveSnowflakeFromTag(TicketTag.TRIAGE);

          if (thread.appliedTags.includes(triageSnowflake)) {
            return this.ticketService.updateTicket(ticket.thread, member, TicketTag.ABANDONED);
          } else {
            return this.ticketService.updateTicket(ticket.thread, member, TicketTag.DONE);
          }
        }),
      ),
    );

    if (!ticketResults.success) {
      return ticketResults;
    }

    // TODO: finish refactor
    try {
      const tagTemplate = await this.templateRepo.findOne({ where: { channel: crew.channel } });
      const botMember = await guild.members.fetchMe();
      await this.tagService.deleteTags(botMember, [tagTemplate]);
      await this.tagService.deleteTagTemplates(botMember, [tagTemplate]);
    } catch (err) {
      this.logger.error(`Failed to update ticket tags: ${err.message}`, err.stack);
    }

    const reason = `Team archived by ${userMention(memberRef)}`;
    const { data: discussion, ...channelResult } = await this.resolveCrewChannel(crew);
    const { data: role, ...roleResult } = await this.resolveCrewRole(crew);

    if (options.archiveTargetRef) {
      let archiveTargetCategory;

      try {
        archiveTargetCategory = await guild.channels.fetch(options.archiveTargetRef);
      } catch (err) {
        this.logger.error(
          `Failed to load archive category ${options.archiveTargetRef} for crew ${crew.name} in ${guild.name}: ${err.message}`,
          err.stack,
        );
      }

      if (archiveTargetCategory && channelResult.success && roleResult.success) {
        await Promise.all([
          discussion.edit({
            name: options.archiveTag
              ? [discussion.name, options.archiveTag.toLowerCase()].join('-')
              : discussion.name,
            permissionOverwrites: [{ id: guild.id, deny: [PermissionsBitField.Flags.ViewChannel] }],
            parent: archiveTargetCategory as CategoryChannel,
          }),
          role.delete(reason),
        ]);
      } else {
        return new OperationStatus({
          success: false,
          message: 'Failed to archive channel. Please report this issue.',
        });
      }
    } else {
      await Promise.all([discussion.delete(reason), role.delete(reason)]);
    }

    await this.crewRepo.softDelete({ channel: channelRef });

    this.logger.log(
      `${userMention(memberRef)} archived crew ${crew.name} (${crew.channel}) in ${guild.name} (${guild.id})`,
    );

    return new OperationStatus({ success: true, message: 'Done', data: crew.name });
  }

  public async updateCrew(
    crew: Crew,
    crewMember: CrewMember,
    update: DeepPartial<Pick<Crew, 'movePrompt' | 'permanent'>>,
  ) {
    if (!crew || !(crew instanceof Crew)) {
      return new OperationStatus({ success: false, message: 'Invalid crew' });
    }

    crewMember =
      typeof crewMember === 'string'
        ? await this.memberRepo.findOne({
            where: { channel: crew.channel, member: crewMember },
          })
        : crewMember;

    if (!crewMember || !(crewMember instanceof CrewMember)) {
      return new OperationStatus({ success: false, message: 'You are not a member of this crew' });
    }

    const { data: member, ...memberResult } =
      await this.memberService.resolveGuildMember(crewMember);

    if (!memberResult.success) {
      return memberResult;
    }

    const { data: isAdmin, ...adminResult } = await this.memberService.isAdmin(member);

    if (!adminResult.success) {
      return adminResult;
    }

    if (!isAdmin && !crewMember.requireAccess(CrewMemberAccess.ADMIN)) {
      return new OperationStatus({
        success: false,
        message: 'Only an administrator can perform this action',
      });
    }

    await this.crewRepo.update({ channel: crew.channel }, update);

    return OperationStatus.SUCCESS;
  }

  public async sendIndividualStatus(
    channel: GuildTextBasedChannel,
    member: GuildMember,
    crew: Crew,
  ): Promise<OperationStatus> {
    const guild = member.guild;

    if (!channel || !channel.isTextBased()) {
      return new OperationStatus({ success: false, message: 'Invalid channel' });
    }

    const fields: { name: string; value: string }[] = [];
    const members = await crew.members;
    const logs = await crew.logs;

    const embed = new EmbedBuilder()
      .setTitle(`Crew: ${crew.name}`)
      .setColor('DarkGreen')
      .setThumbnail(guild.iconURL())
      .setTimestamp()
      .setDescription(
        `${channelMention(crew.channel)} is led by ${userMention((await crew.getCrewOwner()).member)}.`,
      );

    fields.push({
      name: 'Members',
      value: members.map((member) => `- ${userMention(member.member)}`).join('\n'),
    });

    if (logs.length) {
      fields.push({
        name: 'Status',
        value: logs.pop().content,
      });
    }

    embed.addFields(...fields);

    if (channel.id === crew.channel) {
      await channel.send({ embeds: [embed], components: [this.createCrewActions()] });
    } else {
      await channel.send({ embeds: [embed] });
    }

    return OperationStatus.SUCCESS;
  }

  public async sendAllStatus(
    channel: GuildTextBasedChannel,
    member: GuildMember,
  ): Promise<OperationStatus> {
    const guild = member.guild;

    if (!channel || !channel.isTextBased()) {
      return new OperationStatus({ success: false, message: 'Invalid channel' });
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

      const description = `${channelMention(crew.channel)} is led by ${userMention((await crew.getCrewOwner()).member)} and has ${members.length} ${members.length > 1 ? 'members' : 'member'}.`;

      if (logs.length) {
        fields.push({
          name: `${crew.name}`,
          value: `${description}\n\n${logs.pop().content}`,
        });
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

    await channel.send({ embeds: [embed] });

    return OperationStatus.SUCCESS;
  }

  async crewJoinPrompt(crew: Crew, channel?: GuildTextBasedChannel): Promise<OperationStatus> {
    if (!crew) {
      return new OperationStatus({ success: false, message: 'Invalid channel' });
    }

    if (!channel) {
      const { data, ...channelResult } = await this.resolveCrewChannel(crew);
      channel = data;

      if (!channelResult.success) {
        return channelResult;
      }
    }

    const embed = new EmbedBuilder()
      .setTitle(`Join ${crew.name}`)
      // TODO: refactor to use crew repo
      .setDescription(newCrewMessage((await crew.getCrewOwner()).member))
      .setColor('DarkGreen');

    const message = await channel.send({ embeds: [embed], components: [this.createCrewActions()] });
    await message.pin();

    return OperationStatus.SUCCESS;
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
