import { Inject, Injectable, Logger, forwardRef } from '@nestjs/common';
import { DeepPartial, Equal } from 'typeorm';
import {
  GuildBasedChannel,
  GuildMember,
  PermissionsBitField,
  Snowflake,
  roleMention,
  userMention,
} from 'discord.js';
import { OperationStatus } from 'src/util';
import { DatabaseError, ExternalError, InternalError } from 'src/errors';
import { Crew } from 'src/core/crew/crew.entity';
import { CrewService } from 'src/core/crew/crew.service';
import { CrewRepository } from 'src/core/crew/crew.repository';
import { CrewMemberRepository } from './crew-member.repository';
import { CrewMember, CrewMemberAccess } from './crew-member.entity';

@Injectable()
export class CrewMemberService {
  private readonly logger = new Logger(CrewMemberService.name);

  constructor(
    @Inject(forwardRef(() => CrewService)) private readonly crewService: CrewService,
    private readonly crewRepo: CrewRepository,
    private readonly memberRepo: CrewMemberRepository,
  ) {}

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

    const guild = await this.crewService.resolveCrewGuild(crew);

    try {
      return await guild.members.fetch(memberRef);
    } catch (err) {
      throw new ExternalError(
        'DISCORD_API_ERROR',
        `Failed to resolve member ${memberRef} in ${guild.name}`,
        err,
      );
    }
  }

  async registerCrewMember(
    channelRef: Snowflake,
    memberRef: Snowflake,
    access: CrewMemberAccess = CrewMemberAccess.MEMBER,
  ) {
    let crew: Crew;
    try {
      crew = await this.crewRepo.findOneOrFail({ where: { channel: channelRef } });
    } catch (err) {
      throw new DatabaseError('QUERY_FAILED', 'Failed to fetch crew', err);
    }

    const member = await this.resolveGuildMember(memberRef, crew.channel);

    try {
      await member.roles.add(crew.role);
    } catch (err) {
      if (!member.roles.cache.has(crew.role)) {
        throw new ExternalError('DISCORD_API_ERROR', 'Failed to remove member role', err);
      }
    }

    try {
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
    } catch (err) {
      throw new DatabaseError('QUERY_FAILED', 'Failed to insert crew member', err);
    }
  }

  async updateCrewMember(
    crewMember: CrewMember,
    data: DeepPartial<Pick<CrewMember, 'access' | 'name' | 'icon'>>,
  ) {
    try {
      return await this.memberRepo.update(
        { channel: Equal(crewMember.crew.channel), member: Equal(crewMember.member) },
        data,
      );
    } catch (err) {
      throw new DatabaseError('QUERY_FAILED', 'Failed to update crew member', err);
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
  ) {
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
