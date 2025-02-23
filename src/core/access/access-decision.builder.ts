import { AccessDecision } from './access-decision';
import { AccessRule, AccessRuleMode } from './access-rule';
import { AccessRuleInner } from './access-rule-inner';
import { AccessRuleType } from './access.entity';

export class AccessDecisionBuilder {
  private type: AccessRuleType = AccessRuleType.PERMIT;
  private rule: AccessRule = { spec: [], mode: AccessRuleMode.ANY };

  constructor() {}

  setRuleType(type: AccessRuleType) {
    this.type = type;
    return this;
  }

  setCombinationMode(mode: AccessRuleMode) {
    this.rule.mode = mode;
    return this;
  }

  addRule(rule: AccessRuleInner) {
    this.rule.spec.push(rule);
    return this;
  }

  spliceRule(...args: Parameters<Array<AccessRuleInner>['splice']>) {
    this.rule.spec.splice(...args);
    return this;
  }

  build() {
    return new AccessDecision(this.type, this.rule);
  }
}
