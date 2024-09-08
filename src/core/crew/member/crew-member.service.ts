import { Inject, Injectable, Logger, forwardRef } from '@nestjs/common';
import { DeleteResult, Equal, InsertResult } from 'typeorm';
import { GuildManager, GuildMember, PermissionsBitField, Snowflake } from 'discord.js';
import { DatabaseError, ExternalError, InternalError } from 'src/errors';
import { Crew } from 'src/core/crew/crew.entity';
import { CrewService } from 'src/core/crew/crew.service';
import { CrewRepository } from 'src/core/crew/crew.repository';
import { CrewMemberRepository } from './crew-member.repository';
import {
  CrewMember,
  CrewMemberAccess,
  SelectCrewMember,
  UpdateCrewMember,
} from './crew-member.entity';

export abstract class CrewMemberService {
  abstract resolveGuildMember(member: CrewMember): Promise<GuildMember>;
  abstract resolveGuildMember(memberRef: Snowflake, channelRef: Snowflake): Promise<GuildMember>;

  abstract registerCrewMember(
    channelRef: Snowflake,
    memberRef: Snowflake,
    access?: CrewMemberAccess,
  ): Promise<InsertResult>;

  abstract updateCrewMember(
    crewMember: SelectCrewMember,
    data: UpdateCrewMember,
  ): Promise<CrewMember>;

  abstract removeCrewMember(channelRef: Snowflake, memberRef: Snowflake): Promise<DeleteResult>;

  abstract requireCrewAccess(
    channelRef: Snowflake,
    memberRef: Snowflake,
    access?: CrewMemberAccess,
  ): Promise<boolean>;
}

@Injectable()
export class CrewMemberServiceImpl extends CrewMemberService {
  private readonly logger = new Logger(CrewMemberService.name);

  constructor(
    private readonly guildManager: GuildManager,
    @Inject(forwardRef(() => CrewService)) private readonly crewService: CrewService,
    private readonly crewRepo: CrewRepository,
    private readonly memberRepo: CrewMemberRepository,
  ) {
    super();
  }

  async resolveGuildMember(member: CrewMember): Promise<GuildMember>;
  async resolveGuildMember(memberRef: Snowflake, channelRef: Snowflake): Promise<GuildMember>;
  async resolveGuildMember(
    memberRef: Snowflake | CrewMember,
    channelRef?: Snowflake,
  ): Promise<GuildMember> {
    if (typeof memberRef !== 'string' && memberRef instanceof CrewMember) {
      channelRef = memberRef.channel;
      memberRef = memberRef.member;
    }

    if (!memberRef) {
      throw new InternalError('INTERNAL_SERVER_ERROR', 'Invalid member reference');
    }

    let crew: Crew;
    try {
      crew = await this.crewRepo.findOneOrFail({
        where: { channel: channelRef },
        withDeleted: true,
      });
    } catch (err) {
      throw new DatabaseError('QUERY_FAILED', `Unable to find crew ${channelRef}`, err);
    }

    const discordGuild = await this.guildManager.fetch(crew.guild);

    try {
      return await discordGuild.members.fetch(memberRef);
    } catch (err) {
      throw new ExternalError(
        'DISCORD_API_ERROR',
        `Failed to resolve member ${memberRef} in ${discordGuild.name}`,
        err,
      );
    }
  }

  async registerCrewMember(
    channelRef: Snowflake,
    memberRef: Snowflake,
    access: CrewMemberAccess = CrewMemberAccess.MEMBER,
  ): Promise<InsertResult> {
    const crew = await this.crewRepo.findOneOrFail({ where: { channel: channelRef } });
    const member = await this.resolveGuildMember(memberRef, crew.channel);

    try {
      await member.roles.add(crew.role);
    } catch (err) {
      if (!member.roles.cache.has(crew.role)) {
        throw new ExternalError('DISCORD_API_ERROR', 'Failed to add member role', err);
      }
    }

    return await this.memberRepo.upsert(
      {
        member: member.id,
        guild: crew.guild,
        name: member.displayName,
        icon:
          member.avatarURL({ extension: 'png', forceStatic: true }) ??
          member.user.avatarURL({ extension: 'png', forceStatic: true }),
        access,
        channel: crew.channel,
      },
      ['guild', 'member'],
    );
  }

  async updateCrewMember(crewMember: SelectCrewMember, data: UpdateCrewMember) {
    const result = await this.memberRepo.updateReturning(
      { channel: Equal(crewMember.channel), member: Equal(crewMember.member) },
      data,
    );

    if (result?.affected) {
      return (result?.raw as CrewMember[]).pop();
    }
  }

  async removeCrewMember(channelRef: Snowflake, memberRef: Snowflake) {
    let crew: Crew;
    try {
      crew = await this.crewRepo.findOneOrFail({ where: { channel: channelRef } });
    } catch (err) {
      throw new DatabaseError('QUERY_FAILED', 'Failed to fetch crew', err);
    }

    const member = await this.resolveGuildMember(memberRef, channelRef);

    try {
      await member.roles.remove(crew.role);
    } catch (err) {
      if (member.roles.cache.has(crew.role)) {
        throw new ExternalError('DISCORD_API_ERROR', 'Failed to remove member role', err);
      }
    }

    return await this.memberRepo.delete({ member: memberRef, channel: channelRef });
  }

  async requireCrewAccess(
    channelRef: Snowflake,
    memberRef: Snowflake,
    access: CrewMemberAccess = CrewMemberAccess.MEMBER,
  ): Promise<boolean> {
    const member = await this.resolveGuildMember(memberRef, channelRef);

    let crewMember: CrewMember;
    try {
      crewMember = await this.memberRepo.findOne({
        where: { channel: channelRef, member: memberRef },
      });
    } catch (err) {
      throw new DatabaseError('QUERY_FAILED', `Failed to fetch crew member`, err);
    }

    return (
      member.permissions.has(PermissionsBitField.Flags.Administrator) ||
      member.roles.highest.permissions.has(PermissionsBitField.Flags.Administrator) ||
      (crewMember && crewMember.access <= access)
    );
  }
}
