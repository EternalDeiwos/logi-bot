import { Injectable } from '@nestjs/common';
import { InsertResult } from 'typeorm';
import { Interaction, PermissionsBitField } from 'discord.js';
import { CrewMemberService } from 'src/core/crew/member/crew-member.service';
import { AccessEntryQueryBuilder } from './access.query';
import { AccessEntryRepository } from './access.repository';
import { InsertAccessEntry } from './access.entity';
import { AccessDecision } from './access-decision';

export type PartialInteraction = {
  member: Pick<Interaction['member'], 'roles'>;
  user: Pick<Interaction['user'], 'id'>;
} & Pick<Interaction, 'guildId'>;

export abstract class AccessService {
  abstract query(): AccessEntryQueryBuilder;
  abstract createRule(data: InsertAccessEntry): Promise<InsertResult>;
  abstract getTestArgs(
    interaction: PartialInteraction | [PartialInteraction],
  ): Promise<Parameters<AccessDecision['test']>>;
}

@Injectable()
export class AccessServiceImpl extends AccessService {
  constructor(
    private readonly accessRepo: AccessEntryRepository,
    private readonly memberService: CrewMemberService,
  ) {
    super();
  }

  query() {
    return new AccessEntryQueryBuilder(this.accessRepo);
  }

  async createRule(data: InsertAccessEntry) {
    return await this.accessRepo.insert(data);
  }

  async getTestArgs(interaction: Interaction | [Interaction]) {
    if (Array.isArray(interaction)) {
      interaction = interaction.pop();
    }

    const memberSf = interaction.user.id;
    const roles = Array.isArray(interaction.member.roles)
      ? interaction.member.roles
      : Array.from(interaction.member.roles.valueOf().keys());
    const members = await this.memberService
      .query()
      .byGuild({ guildSf: interaction.guildId })
      .byMember(memberSf)
      .getMany();
    const guildAdmin = interaction.memberPermissions.has(PermissionsBitField.Flags.Administrator);

    return [memberSf, roles, members, guildAdmin] as Parameters<AccessDecision['test']>;
  }
}
