import { Logger } from '@nestjs/common';
import { Snowflake } from 'discord.js';
import { CrewMemberAccess } from 'src/types';
import { CrewMember } from 'src/core/crew/member/crew-member.entity';
import { SelectCrewIdDto } from 'src/core/crew/crew.entity';
import { AccessEntry, AccessRuleType } from './access.entity';
import { AccessRule, AccessRuleMode } from './access-rule';
import { AccessRuleInner } from './access-rule-inner';

export class AccessDecision {
  private readonly logger = new Logger(AccessDecision.name);

  constructor(
    private readonly type: AccessRuleType,
    private readonly rule: AccessRule,
  ) {}

  static fromEntry(entry: AccessEntry) {
    return new AccessDecision(entry.type, entry.rule);
  }

  permit(...args: Parameters<AccessDecision['test']>) {
    // Only allow explicitly
    return this.type === AccessRuleType.PERMIT && this.test(...args);
  }

  deny(...args: Parameters<AccessDecision['test']>) {
    // Deny explicitly, and due to absence of passing 'allow' rule
    return (this.type === AccessRuleType.DENY && this.test(...args)) || !this.test(...args);
  }

  private test(
    memberSf: Snowflake,
    roles: Snowflake[],
    members: CrewMember[],
    guildAdmin: boolean,
  ): boolean {
    return this.rule.mode === AccessRuleMode.ALL
      ? this.rule.spec.every((inner) => this.testInner(inner, memberSf, roles, members, guildAdmin))
      : this.rule.spec.some((inner) => this.testInner(inner, memberSf, roles, members, guildAdmin));
  }

  private testInner(
    inner: AccessRuleInner,
    memberSf: Snowflake,
    roles: Snowflake[],
    members: CrewMember[],
    guildAdmin: boolean,
  ): boolean {
    const length = Object.keys(inner).length;
    const result =
      length > 0 && // Empty rule always fails
      (length !== 1 || ![false, null].includes(inner.guildAdmin)) && // Prevent guildAdmin=false becoming a tautology
      (!inner.member || inner.member === memberSf) &&
      (!inner.role || roles.includes(inner.role)) &&
      (!inner.crew ||
        this.testCrew(inner.crew, memberSf, members, inner.crewRole || CrewMemberAccess.MEMBER)) &&
      (!inner.rule || this.testRule(inner.rule, memberSf, roles, members)) &&
      (!inner.guildAdmin || guildAdmin);

    if (result) {
      this.logger.log(`Rule passed for ${memberSf}: ${JSON.stringify(inner)}`);
    }

    return result;
  }

  private testRule(
    rule: AccessRule,
    memberSf: Snowflake,
    roles: Snowflake[],
    members: CrewMember[],
  ): boolean {
    return new AccessDecision(this.type, rule).test(memberSf, roles, members, false);
  }

  private testCrew(
    crewRef: SelectCrewIdDto,
    memberSf: Snowflake,
    members: CrewMember[],
    crewRole: CrewMemberAccess,
  ) {
    const member = members.find(
      (member) => member.crewId === crewRef.id && memberSf === member.memberSf,
    );
    return member && member.access <= crewRole;
  }
}
