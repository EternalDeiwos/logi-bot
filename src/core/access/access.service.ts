import { Injectable } from '@nestjs/common';
import { InsertResult } from 'typeorm';
import { GuildManager, Interaction, PermissionsBitField } from 'discord.js';
import { CrewMemberService } from 'src/core/crew/member/crew-member.service';
import { AccessEntryQueryBuilder } from './access.query';
import { AccessEntryRepository } from './access.repository';
import { InsertAccessEntryDto } from './access.entity';
import { AccessDecision } from './access-decision';
import { DiscordAPIInteraction } from 'src/types';

export type PartialInteraction = {
  member: Pick<Interaction['member'], 'roles'>;
  user: Pick<Interaction['user'], 'id'>;
} & Pick<Interaction, 'guildId' | 'memberPermissions'>;

export abstract class AccessService {
  abstract query(): AccessEntryQueryBuilder;
  abstract createRule(data: InsertAccessEntryDto): Promise<InsertResult>;
  abstract getTestArgs(
    interaction: DiscordAPIInteraction | [DiscordAPIInteraction],
  ): Promise<Parameters<AccessDecision['test']>>;
  abstract getTestArgs(
    interaction: PartialInteraction | [PartialInteraction],
  ): Promise<Parameters<AccessDecision['test']>>;
}

@Injectable()
export class AccessServiceImpl extends AccessService {
  constructor(
    private readonly guildManager: GuildManager,
    private readonly accessRepo: AccessEntryRepository,
    private readonly memberService: CrewMemberService,
  ) {
    super();
  }

  query() {
    return new AccessEntryQueryBuilder(this.accessRepo);
  }

  async createRule(data: InsertAccessEntryDto) {
    return await this.accessRepo.insert(data);
  }

  async getTestArgs(
    interaction:
      | PartialInteraction
      | [PartialInteraction]
      | DiscordAPIInteraction
      | [DiscordAPIInteraction],
  ) {
    if (Array.isArray(interaction)) {
      interaction = interaction.pop();
    }

    let memberSf: string;
    let member: Pick<Interaction['member'], 'roles'>;
    let memberPermissions: Readonly<PermissionsBitField>;

    if (this.isDehydratedInteraction(interaction)) {
      memberSf = interaction.user;
      const discordGuild = await this.guildManager.fetch(interaction.guildId);
      const guildMember = await discordGuild.members.fetch(memberSf);
      memberPermissions = guildMember.permissions;
      member = guildMember;
    } else {
      memberSf = interaction.user?.id;
      member = interaction.member;
      memberPermissions = interaction.memberPermissions;
    }

    const roles = Array.isArray(member.roles)
      ? member.roles
      : Array.from(member.roles.valueOf().keys());
    const members = await this.memberService
      .query()
      .byGuild({ guildSf: interaction.guildId })
      .byMember(memberSf)
      .withoutDeletedCrews()
      .getMany();
    const guildAdmin = memberPermissions.has(PermissionsBitField.Flags.Administrator);

    return [memberSf, roles, members, guildAdmin] as Parameters<AccessDecision['test']>;
  }

  private isDehydratedInteraction(
    interaction: PartialInteraction | DiscordAPIInteraction,
  ): interaction is DiscordAPIInteraction {
    return typeof interaction.user === 'string';
  }
}
