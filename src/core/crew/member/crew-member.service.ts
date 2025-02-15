import { Inject, Injectable, Logger, forwardRef } from '@nestjs/common';
import { DeleteResult, Equal, InsertResult, IsNull, UpdateResult } from 'typeorm';
import {
  GuildBasedChannel,
  GuildManager,
  GuildMember,
  PermissionsBitField,
  Snowflake,
} from 'discord.js';
import { ExternalError, InternalError } from 'src/errors';
import { CrewMemberAccess } from 'src/types';
import { SelectGuild } from 'src/core/guild/guild.entity';
import { GuildService } from 'src/core/guild/guild.service';
import { Crew, SelectCrew } from 'src/core/crew/crew.entity';
import { CrewService } from 'src/core/crew/crew.service';
import { CrewMemberRepository } from './crew-member.repository';
import { CrewMember, SelectCrewMember, UpdateCrewMember } from './crew-member.entity';
import { CrewMemberQueryBuilder } from './crew-member.query';

export abstract class CrewMemberService {
  abstract query(): CrewMemberQueryBuilder;

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

  abstract removeGuildMemberCrews(
    guildRef: SelectGuild,
    memberRef: Snowflake,
  ): Promise<UpdateResult>;

  abstract removeCrewMember(crew: Crew, member: GuildMember): Promise<DeleteResult>;
  abstract removeCrewMember(crew: Crew, memberRef: Snowflake): Promise<DeleteResult>;
  abstract removeCrewMember(channelRef: Snowflake, member: GuildMember): Promise<DeleteResult>;
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
  abstract reconcileCrewMembership(crewRef: SelectCrew): Promise<void>;
  abstract reconcileIndividualMembership(
    guildRef: SelectGuild,
    memberRef: Snowflake,
  ): Promise<void>;
}

@Injectable()
export class CrewMemberServiceImpl extends CrewMemberService {
  private readonly logger = new Logger(CrewMemberService.name);

  constructor(
    private readonly guildManager: GuildManager,
    private readonly guildService: GuildService,
    @Inject(forwardRef(() => CrewService)) private readonly crewService: CrewService,
    private readonly memberRepo: CrewMemberRepository,
  ) {
    super();
  }

  query(): CrewMemberQueryBuilder {
    return new CrewMemberQueryBuilder(this.memberRepo);
  }

  async resolveGuildMember(member: CrewMember): Promise<GuildMember>;
  async resolveGuildMember(memberRef: Snowflake, channelRef: Snowflake): Promise<GuildMember>;
  async resolveGuildMember(
    memberRef: Snowflake | CrewMember,
    channelRef?: Snowflake,
  ): Promise<GuildMember> {
    if (memberRef instanceof CrewMember) {
      channelRef = memberRef.crewId;
      memberRef = memberRef.memberSf;
    }

    if (!memberRef) {
      throw new InternalError('INTERNAL_SERVER_ERROR', 'Invalid member reference');
    }

    const crew = await this.crewService
      .query()
      .withDeleted()
      .byCrew({ crewSf: channelRef })
      .getOneOrFail();

    const discordGuild = await this.guildManager.fetch(crew.guild.guildSf);
    return await discordGuild.members.fetch(memberRef);
  }

  async registerCrewMember(
    channelRef: Snowflake,
    memberRef: Snowflake,
    access?: CrewMemberAccess,
  ): Promise<InsertResult> {
    const crew = await this.crewService.query().byCrew({ crewSf: channelRef }).getOneOrFail();
    const member = await this.resolveGuildMember(memberRef, crew.crewSf);

    try {
      await member.roles.add(crew.roleSf);
    } catch (err) {
      if (!member.roles.cache.has(crew.roleSf)) {
        throw new ExternalError('DISCORD_API_ERROR', 'Failed to add member role', err);
      }
    }

    const result = await this.memberRepo.safeUpsert({
      memberSf: memberRef,
      guildId: crew.guildId,
      name: member.displayName,
      access,
      crewId: crew.id,
    });

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
        crewId: Equal(crewMember.crewId),
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

  async removeGuildMemberCrews(guildRef: SelectGuild, memberRef: Snowflake) {
    guildRef = guildRef.id
      ? guildRef
      : await this.guildService.query().byGuild(guildRef).getOneOrFail();
    return this.memberRepo.updateReturning(
      {
        guildId: guildRef.id,
        memberSf: memberRef,
      },
      { deletedAt: new Date() },
    );
  }

  async removeCrewMember(channelRef: Snowflake | Crew, memberRef: Snowflake | GuildMember) {
    const crew =
      channelRef instanceof Crew
        ? channelRef
        : await this.crewService
            .query()
            .withDeleted()
            .byCrew({ crewSf: channelRef })
            .getOneOrFail();

    let member: GuildMember;
    try {
      member =
        memberRef instanceof GuildMember
          ? memberRef
          : await this.resolveGuildMember(memberRef, crew.crewSf);

      memberRef = member.id;
    } catch {
      this.logger.debug(`Guild member ${memberRef} has already left the guild`);
    }

    try {
      if (member) {
        await member.roles.remove(crew.roleSf);
      }
    } catch (err) {
      if (member.roles.cache.has(crew.roleSf)) {
        throw new ExternalError('DISCORD_API_ERROR', 'Failed to remove member role', err);
      }
    }

    const result = await this.memberRepo.updateReturning(
      { memberSf: Equal(memberRef as Snowflake), crewId: Equal(crew.id), deletedAt: IsNull() },
      { deletedAt: new Date() },
    );

    await this.reconcileCrewLeaderRole({ id: crew.guildId }, memberRef as Snowflake);

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

    const crew = await this.crewService.query().byCrew({ crewSf: channelRef }).getOneOrFail();
    const discordGuild = await this.guildManager.fetch(crew.guild.guildSf);
    const member = await discordGuild.members.fetch(memberRef);

    const crewMember = await this.query()
      .byCrew({ crewSf: channelRef })
      .byMember(memberRef)
      .getOne();

    return (
      (checkAdmin &&
        (member.permissions.has(PermissionsBitField.Flags.Administrator) ||
          member.roles.highest.permissions.has(PermissionsBitField.Flags.Administrator))) ||
      (crewMember && crewMember.access <= access)
    );
  }

  async reconcileCrewLeaderRole(guildRef: SelectGuild, memberRef: Snowflake) {
    const guild = await this.guildService.query().byGuild(guildRef).getOneOrFail();

    if (!guild.config?.crewLeaderRole) {
      this.logger.debug('Crew leader not set', JSON.stringify(guild));
      return; // NOOP if not set
    }

    const discordGuild = await this.guildManager.fetch(guild.guildSf);
    const member = await discordGuild.members.fetch(memberRef);

    const count = await this.query()
      .byGuild(guildRef)
      .byMember(memberRef)
      .byAccess(CrewMemberAccess.OWNER)
      .getCount();

    this.logger.debug(`Leadership for ${member.displayName}: ${count}`);
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

  async reconcileCrewMembership(crewRef: SelectCrew) {
    const crew = await this.crewService.query().byCrew(crewRef).withMembers().getOneOrFail();
    const discordGuild = await this.guildManager.fetch(crew.guild.guildSf);
    const channel = await discordGuild.channels.fetch(crew.crewSf);

    for (const crewMember of crew.members) {
      let member: GuildMember;
      try {
        member = await discordGuild.members.fetch(crewMember.memberSf);
      } catch {
        await this.removeCrewMember(crew, crewMember.memberSf);
        continue;
      }

      if (
        !channel.permissionsFor(member).has(PermissionsBitField.Flags.ViewChannel) &&
        crewMember.access >= CrewMemberAccess.MEMBER
      ) {
        await this.removeCrewMember(crew, member);
        continue;
      }

      if (!member.roles.cache.has(crew.roleSf)) {
        await this.removeCrewMember(crew, member);
        continue;
      }

      if (
        crew.guild?.config?.crewViewerRole &&
        crew.isSecureOnly &&
        !member.roles.cache.has(crew.guild?.config?.crewViewerRole) &&
        crewMember.access >= CrewMemberAccess.MEMBER
      ) {
        await this.removeCrewMember(crewMember.crew, member);
        continue;
      }
    }
  }

  async reconcileIndividualMembership(guildRef: SelectGuild, memberRef: Snowflake) {
    const guild = await this.guildService.query().byGuild(guildRef).getOneOrFail();
    const discordGuild = await this.guildManager.fetch(guild.guildSf);
    let member: GuildMember;

    try {
      member = await discordGuild.members.fetch(memberRef);
    } catch {
      const guildWhere = guildRef.id
        ? { guildId: Equal(guildRef.id) }
        : { guild: { guildSf: Equal(guildRef.guildSf) } };
      await this.memberRepo.updateReturning(
        { ...guildWhere, memberSf: memberRef, deletedAt: IsNull() },
        { deletedAt: new Date() },
      );
    }

    const members = await this.query().byGuild(guildRef).byMember(memberRef).getMany();
    for (const crewMember of members) {
      let channel: GuildBasedChannel | null;
      try {
        channel = await discordGuild.channels.fetch(crewMember.crew.crewSf);
      } catch (err) {
        this.logger.warn(err.message);
      }

      if (!channel) {
        await this.removeCrewMember(crewMember.crew, member);
        continue;
      }

      if (
        !channel.permissionsFor(member).has(PermissionsBitField.Flags.ViewChannel) &&
        crewMember.access >= CrewMemberAccess.MEMBER
      ) {
        await this.removeCrewMember(crewMember.crew, member);
        continue;
      }

      if (crewMember.crew?.roleSf && !member.roles.cache.has(crewMember.crew.roleSf)) {
        await this.removeCrewMember(crewMember.crew, member);
        continue;
      }

      if (
        crewMember.crew?.guild?.config?.crewViewerRole &&
        crewMember.crew?.isSecureOnly &&
        !member.roles.cache.has(crewMember.crew?.guild?.config?.crewViewerRole) &&
        crewMember.access >= CrewMemberAccess.MEMBER
      ) {
        await this.removeCrewMember(crewMember.crew, member);
        continue;
      }
    }
  }
}
