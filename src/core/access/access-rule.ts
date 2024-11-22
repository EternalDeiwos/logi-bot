import { Expose, Type } from 'class-transformer';
import { AccessRuleInner } from './access-rule-inner';
import { ApiProperty } from '@nestjs/swagger';

export enum AccessRuleMode {
  ANY = 'anyOf',
  ALL = 'allOf',
}

export class AccessRule {
  @Expose()
  @ApiProperty({ enum: AccessRuleMode })
  mode: AccessRuleMode;

  @Expose()
  @ApiProperty({ type: () => [AccessRuleInner] })
  @Type(() => AccessRuleInner)
  spec: AccessRuleInner[];
}
