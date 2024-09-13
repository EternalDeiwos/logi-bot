import { Inject, Injectable, Logger, forwardRef } from '@nestjs/common';
import { DeleteResult, Equal, InsertResult, IsNull, UpdateResult } from 'typeorm';
import { GuildManager, GuildMember, PermissionsBitField, Snowflake } from 'discord.js';
import { DatabaseError, ExternalError, InternalError } from 'src/errors';
import { CrewMemberAccess } from 'src/types';
import { SelectGuild } from 'src/core/guild/guild.entity';
import { GuildService } from 'src/core/guild/guild.service';
import { Crew } from 'src/core/crew/crew.entity';
import { CrewService } from 'src/core/crew/crew.service';
import { CrewRepository } from 'src/core/crew/crew.repository';
import { CrewMemberRepository } from './crew-member.repository';
import { CrewMember, SelectCrewMember, UpdateCrewMember } from './crew-member.entity';

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
  ): Promise<UpdateResult>;

  abstract removeCrewMember(channelRef: Snowflake, memberRef: Snowflake): Promise<DeleteResult>;

  abstract requireCrewAccess(
    channelRef: Snowflake,
    memberRef: Snowflake,
    checkAdmin?: boolean,
  ): Promise<boolean>;
  abstract requireCrewAccess(
    channelRef: Snowflake,
    memberRef: Snowflake,
    access?: CrewMemberAccess,
  ): Promise<boolean>;
  abstract requireCrewAccess(
    channelRef: Snowflake,
    memberRef: Snowflake,
    access?: CrewMemberAccess,
    checkAdmin?: boolean,
  ): Promise<boolean>;

  abstract reconcileCrewLeaderRole(guildRef: SelectGuild, memberRef: Snowflake): Promise<void>;
}

@Injectable()
export class CrewMemberServiceImpl extends CrewMemberService {
  private readonly logger = new Logger(CrewMemberService.name);

  constructor(
    private readonly guildManager: GuildManager,
    private readonly guildService: GuildService,
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
      channelRef = memberRef.crewSf;
      memberRef = memberRef.memberSf;
    }

    if (!memberRef) {
      throw new InternalError('INTERNAL_SERVER_ERROR', 'Invalid member reference');
    }

    const crew = await this.crewRepo.findOneOrFail({
      where: { crewSf: channelRef },
      withDeleted: true,
    });

    const discordGuild = await this.guildManager.fetch(crew.guild.guildSf);
    return await discordGuild.members.fetch(memberRef);
  }

  async registerCrewMember(
    channelRef: Snowflake,
    memberRef: Snowflake,
    access: CrewMemberAccess = CrewMemberAccess.MEMBER,
  ): Promise<InsertResult> {
    const crew = await this.crewRepo.findOneOrFail({ where: { crewSf: channelRef } });
    const member = await this.resolveGuildMember(memberRef, crew.crewSf);

    try {
      await member.roles.add(crew.roleSf);
    } catch (err) {
      if (!member.roles.cache.has(crew.roleSf)) {
        throw new ExternalError('DISCORD_API_ERROR', 'Failed to add member role', err);
      }
    }

    const result = await this.memberRepo.upsert(
      {
        memberSf: memberRef,
        guildId: crew.guildId,
        name: member.displayName,
        access,
        crewSf: crew.crewSf,
      },
      ['crewSf', 'memberSf', 'deletedAt'],
    );

    if (
      access === CrewMemberAccess.OWNER &&
      crew.guild.config?.crewLeaderRole &&
      !member.roles.cache.has(crew.guild.config.crewLeaderRole)
    ) {
      await member.roles.add(crew.guild.config.crewLeaderRole);
      this.logger.log(`${member.displayName} added to crew leaders in ${crew.guild.name}`);
    }

    return result;
  }

  async updateCrewMember(crewMember: SelectCrewMember, data: UpdateCrewMember) {
    const result = await this.memberRepo.updateReturning(
      {
        crewSf: Equal(crewMember.crewSf),
        memberSf: Equal(crewMember.memberSf),
        deletedAt: IsNull(),
      },
      data,
    );

    if (result?.affected) {
      const { guild_id: guildId } = result?.raw.pop();
      await this.reconcileCrewLeaderRole({ id: guildId }, crewMember.memberSf);
    }

    return result;
  }

  async removeCrewMember(channelRef: Snowflake, memberRef: Snowflake) {
    let crew: Crew;
    try {
      crew = await this.crewRepo.findOneOrFail({ where: { crewSf: channelRef } });
    } catch (err) {
      throw new DatabaseError('QUERY_FAILED', 'Failed to fetch crew', err);
    }

    const member = await this.resolveGuildMember(memberRef, channelRef);

    try {
      await member.roles.remove(crew.roleSf);
    } catch (err) {
      if (member.roles.cache.has(crew.roleSf)) {
        throw new ExternalError('DISCORD_API_ERROR', 'Failed to remove member role', err);
      }
    }

    const result = await this.memberRepo.updateReturning(
      { memberSf: Equal(memberRef), crewSf: Equal(channelRef), deletedAt: IsNull() },
      { deletedAt: new Date() },
    );

    await this.reconcileCrewLeaderRole({ id: crew.guildId }, memberRef);

    return result;
  }

  async requireCrewAccess(
    channelRef: Snowflake,
    memberRef: Snowflake,
    access?: CrewMemberAccess | boolean,
    checkAdmin = true,
  ): Promise<boolean> {
    // Resolve multiple signatures
    if (typeof access === 'boolean') {
      checkAdmin = access;
      access = CrewMemberAccess.MEMBER;
    }

    const crew = await this.crewService.getCrew({ crewSf: channelRef });
    const discordGuild = await this.guildManager.fetch(crew.guild.guildSf);
    const member = await discordGuild.members.fetch(memberRef);

    const crewMember = await this.memberRepo.findOneBy({
      crewSf: Equal(channelRef),
      memberSf: Equal(memberRef),
      deletedAt: IsNull(),
    });

    return (
      (checkAdmin &&
        (member.permissions.has(PermissionsBitField.Flags.Administrator) ||
          member.roles.highest.permissions.has(PermissionsBitField.Flags.Administrator))) ||
      (crewMember && crewMember.access <= access)
    );
  }

  async reconcileCrewLeaderRole(guildRef: SelectGuild, memberRef: Snowflake) {
    const guild = await this.guildService.getGuild(guildRef);

    if (!guild.config?.crewLeaderRole) {
      this.logger.debug('Crew leader not set', JSON.stringify(guild));
      return; // NOOP if not set
    }

    const discordGuild = await this.guildManager.fetch(guild.guildSf);
    const member = await discordGuild.members.fetch(memberRef);

    const [membership, count] = await this.memberRepo.findByAccess(
      guildRef,
      memberRef,
      CrewMemberAccess.OWNER,
    );
    this.logger.debug(JSON.stringify([{ count }, membership]));

    if (count && !member.roles.cache.has(guild.config.crewLeaderRole)) {
      await member.roles.add(guild.config.crewLeaderRole);
      this.logger.log(`${member.displayName} added to crew leaders in ${guild.name}`);
    } else if (!count && member.roles.cache.has(guild.config.crewLeaderRole)) {
      await member.roles.remove(guild.config.crewLeaderRole);
      this.logger.log(`${member.displayName} removed from crew leaders in ${guild.name}`);
    } else {
      this.logger.debug(`No leadership change for ${member.displayName} in ${guild.name}`);
    }
  }
}
