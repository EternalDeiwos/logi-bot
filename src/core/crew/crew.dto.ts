import { PickType } from '@nestjs/swagger';
import { Expose, Type } from 'class-transformer';
import { GuildDto } from 'src/core/guild/guild.dto';
import { TeamDto } from 'src/core/team/team.dto';
import { CrewMemberDto } from 'src/core/crew/member/crew-member.dto';
import { Crew } from './crew.entity';

export class CrewDto extends PickType(Crew, [
  'crewSf',
  'voiceSf',
  'createdAt',
  'createdBy',
  'deletedAt',
  'deletedBy',
  'hasMovePrompt',
  'isPermanent',
  'isSecureOnly',
  'name',
  'shortName',
  'slug',
  'roleSf',
] as const) {
  @Expose()
  guild: GuildDto;

  @Expose()
  team: TeamDto;

  @Type(() => CrewMemberDto)
  @Expose()
  members: CrewMemberDto[];
}
