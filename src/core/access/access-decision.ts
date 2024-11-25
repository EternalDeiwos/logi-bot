import { Logger } from '@nestjs/common';
import { Snowflake } from 'discord.js';
import { SelectCrewMember } from 'src/core/crew/member/crew-member.entity';
import { SelectCrew } from 'src/core/crew/crew.entity';
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

  private test(memberSf: Snowflake, roles: Snowflake[], members: SelectCrewMember[]): boolean {
    return this.rule.mode === AccessRuleMode.ALL
      ? this.rule.spec.every((inner) => this.testInner(inner, memberSf, roles, members))
      : this.rule.spec.some((inner) => this.testInner(inner, memberSf, roles, members));
  }

  private testInner(
    inner: AccessRuleInner,
    memberSf: Snowflake,
    roles: Snowflake[],
    members: SelectCrewMember[],
  ): boolean {
    return (
      (!inner.member || inner.member === memberSf) &&
      (!inner.role || roles.includes(inner.role)) &&
      (!inner.crew || this.testCrew(inner.crew, memberSf, members)) &&
      (!inner.rule || this.testRule(inner.rule, memberSf, roles, members))
    );
  }

  private testRule(
    rule: AccessRule,
    memberSf: Snowflake,
    roles: Snowflake[],
    members: SelectCrewMember[],
  ): boolean {
    return new AccessDecision(this.type, rule).test(memberSf, roles, members);
  }

  private testCrew(crewRef: SelectCrew, memberSf: Snowflake, members: SelectCrewMember[]) {
    return (
      members.findIndex(
        (member) => member.crewSf === crewRef.crewSf && memberSf === member.memberSf,
      ) > -1
    );
  }
}
