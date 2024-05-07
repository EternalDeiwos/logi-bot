import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DeepPartial, Equal, Repository } from 'typeorm';
import { ChannelType, Guild, GuildChannelResolvable, GuildMember, roleMention } from 'discord.js';
import { ConfigService } from 'src/config';
import { OperationStatus } from 'src/types';
import { TeamService } from 'src/bot/team/team.service';
import { Crew } from './crew.entity';
import { CrewMember, CrewMemberAccess } from './crew-member.entity';
import { toSlug } from 'src/util';

@Injectable()
export class CrewService {
  private readonly logger = new Logger(CrewService.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly teamService: TeamService,
    @InjectRepository(Crew) private readonly crewRepo: Repository<Crew>,
    @InjectRepository(CrewMember) private readonly memberRepo: Repository<CrewMember>,
  ) {}

  async getCrew(channelRef: GuildChannelResolvable) {
    return this.crewRepo.findOne({
      where: { channel: typeof channelRef === 'string' ? channelRef : channelRef.id },
    });
  }

  async getCrews(guild: Guild) {
    return this.crewRepo.find({ where: { guild: guild.id } });
  }

  async searchCrew(query: string) {
    return this.crewRepo
      .createQueryBuilder('crew')
      .where(`name ILIKE :query`, { query: `%${query}%` })
      .orWhere(`name_short ILIKE :query`, { query: `%${query}%` })
      .getMany();
  }

  async getCrewMember(channelRef: GuildChannelResolvable, member: GuildMember) {
    return this.memberRepo.findOne({
      where: {
        channel: typeof channelRef === 'string' ? channelRef : channelRef.id,
        member: member.id,
      },
    });
  }

  async registerCrew(
    categoryRef: GuildChannelResolvable,
    member: GuildMember,
    name?: string,
    shortName?: string,
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

    if (!member.roles.cache.has(team.role)) {
      return { success: false, message: `You do not have the ${roleMention(team.role)} role.` };
    }

    name = name || category.name;
    shortName = shortName || name;
    const slug = toSlug(name);

    const role = await member.guild.roles.create({
      name,
      mentionable: true,
    });

    const channel = await member.guild.channels.create({
      name: slug,
      parent: category.id,
      type: ChannelType.GuildText,
    });

    await this.crewRepo.insert({
      channel: channel.id,
      guild: member.guild.id,
      name,
      shortName,
      slug,
      role: role.id,
      forum: team.forum,
      createdBy: member.id,
    });

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

    const team = await crew.team;

    if (!member.roles.cache.has(team.role)) {
      return { success: false, message: `You do not have the ${roleMention(team.role)} role.` };
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
  ): Promise<OperationStatus> {
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

    const role = guild.roles.cache.get(crew.role);

    const crewMember = await this.getCrewMember(channel, member);

    if (!crewMember) {
      return { success: false, message: 'Not a member of this crew' };
    }

    if (crewMember.access > CrewMemberAccess.ADMIN) {
      return { success: false, message: 'Only an administrator can perform this action' };
    }

    const reason = `Team archived by ${member.displayName}`;
    const discussion = await guild.channels.fetch(crew.channel);

    await Promise.all([discussion.delete(reason), role.delete(reason)]);
    await this.crewRepo.softDelete({ channel: channel.id });

    this.logger.log(
      `${member.displayName} archived crew ${crew.name} (${crew.channel}) in ${guild.name} (${guild.id})`,
    );

    return { success: true, message: 'Done' };
  }
}
