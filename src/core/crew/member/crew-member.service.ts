import { Inject, Injectable, Logger, forwardRef } from '@nestjs/common';
import { DeleteResult, Equal, InsertResult, IsNull, UpdateResult } from 'typeorm';
import {
  GuildBasedChannel,
  GuildManager,
  GuildMember,
  PermissionsBitField,
  Snowflake,
} from 'discord.js';
import { ExternalError } from 'src/errors';
import { CrewMemberAccess } from 'src/types';
import { BotService } from 'src/bot/bot.service';
import { DiscordActionTarget, DiscordActionType } from 'src/bot/discord-actions.consumer';
import { SelectGuildDto } from 'src/core/guild/guild.entity';
import { GuildService } from 'src/core/guild/guild.service';
import { GuildSettingName } from 'src/core/guild/guild-setting.entity';
import { Crew, SelectCrewDto } from 'src/core/crew/crew.entity';
import { CrewService } from 'src/core/crew/crew.service';
import { CrewMemberRepository } from './crew-member.repository';
import { SelectCrewMemberDto, UpdateCrewMemberDto } from './crew-member.entity';
import { CrewMemberQueryBuilder } from './crew-member.query';
import { CrewSettingName } from '../crew-setting.entity';

export abstract class CrewMemberService {
  abstract query(): CrewMemberQueryBuilder;

  abstract registerCrewMember(
    crewRef: SelectCrewDto,
    memberRef: Snowflake,
    access?: CrewMemberAccess,
  ): Promise<InsertResult>;

  abstract updateCrewMember(
    crewMember: SelectCrewMemberDto,
    data: UpdateCrewMemberDto,
  ): Promise<UpdateResult>;

  abstract removeGuildMemberCrews(
    guildRef: SelectGuildDto,
    memberRef: Snowflake,
  ): Promise<UpdateResult>;

  abstract removeCrewMember(
    crewRef: String | Crew,
    memberRef: Snowflake | GuildMember,
  ): Promise<DeleteResult>;

  abstract reconcileCrewLeaderRole(guildRef: SelectGuildDto, memberRef: Snowflake): Promise<void>;
  abstract reconcileCrewMembership(crewRef: SelectCrewDto): Promise<void>;
  abstract reconcileIndividualMembership(
    guildRef: SelectGuildDto,
    memberRef: Snowflake,
  ): Promise<void>;
}

@Injectable()
export class CrewMemberServiceImpl extends CrewMemberService {
  private readonly logger = new Logger(CrewMemberService.name);

  constructor(
    private readonly guildManager: GuildManager,
    private readonly botService: BotService,
    private readonly guildService: GuildService,
    @Inject(forwardRef(() => CrewService)) private readonly crewService: CrewService,
    private readonly memberRepo: CrewMemberRepository,
  ) {
    super();
  }

  query(): CrewMemberQueryBuilder {
    return new CrewMemberQueryBuilder(this.memberRepo);
  }

  async registerCrewMember(
    crewRef: SelectCrewDto,
    memberRef: Snowflake,
    access?: CrewMemberAccess,
  ): Promise<InsertResult> {
    const crew = await this.crewService.query().byCrew(crewRef).withGuildSettings().getOneOrFail();
    const discordGuild = await this.guildManager.fetch(crew.guild.guildSf);
    const member = await discordGuild.members.fetch(memberRef);

    const result = await this.memberRepo.safeUpsert({
      memberSf: memberRef,
      guildId: crew.guildId,
      name: member.displayName,
      access,
      crewId: crew.id,
    });

    if (crew.roleSf) {
      await this.queueAssignCrewRole(crew, memberRef);
    }

    if (access === CrewMemberAccess.OWNER) {
      await this.queueAssignCrewLeaderRole(crew, memberRef);
    }

    return result;
  }

  async queueAssignCrewRole(crew: Crew, memberSf: Snowflake) {
    return this.botService.publishDiscordAction({
      type: DiscordActionType.ASSIGN_ROLE,
      guildSf: crew.guild.guildSf,
      roleSf: crew.roleSf,
      memberSf: memberSf,
    });
  }

  async queueAssignCrewLeaderRole(crew: Crew, memberSf: Snowflake) {
    const guildConfig = crew.guild.getConfig();

    if (guildConfig[GuildSettingName.CREW_LEADER_ROLE]) {
      return this.botService.publishDiscordAction({
        type: DiscordActionType.ASSIGN_ROLE,
        guildSf: crew.guild.guildSf,
        roleSf: guildConfig[GuildSettingName.CREW_LEADER_ROLE],
        memberSf: memberSf,
        target: {
          type: DiscordActionTarget.CREW_MEMBER,
          crewId: crew.id,
          memberSf: memberSf,
          field: 'crewLeader',
        },
      });
    }
  }

  async updateCrewMember(crewMember: SelectCrewMemberDto, data: UpdateCrewMemberDto) {
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

  async removeGuildMemberCrews(guildRef: SelectGuildDto, memberRef: Snowflake) {
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

  async removeCrewMember(crewRef: string | Crew, memberRef: Snowflake | GuildMember) {
    const crew =
      typeof crewRef === 'string'
        ? await this.crewService.query().byCrew({ id: crewRef }).withoutPending().getOneOrFail()
        : crewRef;

    const crewMember = await this.query()
      .byCrew({ id: crew.id })
      .byMember(typeof memberRef === 'string' ? memberRef : memberRef.id)
      .getOneOrFail();

    const discordGuild = await this.guildManager.fetch(crew.guild.guildSf);

    let member: GuildMember;
    try {
      member =
        typeof memberRef === 'string'
          ? await discordGuild.members.fetch(crewMember.memberSf)
          : memberRef;
    } catch {
      this.logger.debug(`Guild member ${memberRef} has already left the guild`);
    }

    try {
      if (member) {
        await member.roles.remove(crew.roleSf);
      }
    } catch (err) {
      const role = await discordGuild.roles.fetch(crew.roleSf);
      if (role.members.has(crewMember.memberSf)) {
        throw new ExternalError('DISCORD_API_ERROR', 'Failed to remove member role', err);
      }
    }

    const result = await this.memberRepo.updateReturning(
      { memberSf: Equal(crewMember.memberSf), crewId: Equal(crew.id), deletedAt: IsNull() },
      { deletedAt: new Date() },
    );

    await this.reconcileCrewLeaderRole({ id: crew.guildId }, memberRef as Snowflake);

    return result;
  }

  async reconcileCrewLeaderRole(guildRef: SelectGuildDto, memberRef: Snowflake) {
    const guild = await this.guildService.query().byGuild(guildRef).getOneOrFail();

    if (!guild.getConfig()['crew.leader_role']) {
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
    if (count && !member.roles.cache.has(guild.getConfig()['crew.leader_role'])) {
      await member.roles.add(guild.getConfig()['crew.leader_role']);
      this.logger.log(`${member.displayName} added to crew leaders in ${guild.name}`);
    } else if (!count && member.roles.cache.has(guild.getConfig()['crew.leader_role'])) {
      await member.roles.remove(guild.getConfig()['crew.leader_role']);
      this.logger.log(`${member.displayName} removed from crew leaders in ${guild.name}`);
    } else {
      this.logger.debug(`No leadership change for ${member.displayName} in ${guild.name}`);
    }
  }

  async reconcileCrewMembership(crewRef: SelectCrewDto) {
    const crew = await this.crewService
      .query()
      .byCrew(crewRef)
      .withMembers()
      .withSettings()
      .getOneOrFail();
    const {
      [CrewSettingName.CREW_PRUNING]: autoPruneFlag,
      [CrewSettingName.CREW_OPSEC]: opsecFlag,
    } = crew.getConfig();

    if (!autoPruneFlag || !autoPruneFlag.asBoolean()) {
      return;
    }

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
        crew.guild?.getConfig()['crew.viewer_role'] &&
        opsecFlag &&
        opsecFlag.asBoolean() &&
        !member.roles.cache.has(crew.guild?.getConfig()['crew.viewer_role']) &&
        crewMember.access >= CrewMemberAccess.MEMBER
      ) {
        await this.removeCrewMember(crewMember.crew, member);
        continue;
      }
    }
  }

  async reconcileIndividualMembership(guildRef: SelectGuildDto, memberRef: Snowflake) {
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

    const members = await this.query()
      .byGuild(guildRef)
      .byMember(memberRef)
      .withGuildSettings()
      .withCrewSettings()
      .withoutPending()
      .getMany();
    for (const crewMember of members) {
      const { [CrewSettingName.CREW_OPSEC]: opsecFlag } = crewMember.crew.getConfig();
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
        crewMember.crew?.guild?.getConfig()['crew.viewer_role'] &&
        opsecFlag &&
        opsecFlag.asBoolean() &&
        !member.roles.cache.has(crewMember.crew?.guild?.getConfig()['crew.viewer_role']) &&
        crewMember.access >= CrewMemberAccess.MEMBER
      ) {
        await this.removeCrewMember(crewMember.crew, member);
        continue;
      }
    }
  }
}
