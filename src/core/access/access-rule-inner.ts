import { ApiProperty } from '@nestjs/swagger';
import { Expose, Type } from 'class-transformer';
import { Snowflake } from 'discord.js';
import { CrewMemberAccess } from 'src/types';
import { SelectCrewDto } from 'src/core/crew/crew.entity';
import { AccessRule } from './access-rule';

export class AccessRuleInner {
  @Expose()
  @ApiProperty({ type: () => SelectCrewDto })
  @Type(() => SelectCrewDto)
  crew?: SelectCrewDto;

  @Expose()
  @ApiProperty({ enum: CrewMemberAccess })
  crewRole?: CrewMemberAccess;

  @Expose()
  @ApiProperty()
  role?: Snowflake;

  @Expose()
  @ApiProperty()
  member?: Snowflake;

  @Expose()
  @ApiProperty({ type: () => AccessRule })
  @Type(() => AccessRule)
  rule?: AccessRule;

  @Expose()
  @ApiProperty()
  guildAdmin?: boolean;
}
