import { PickType } from '@nestjs/swagger';
import { Team } from './team.entity';

export class TeamDto extends PickType(Team, [
  'categorySf',
  'createdAt',
  'forumSf',
  'name',
] as const) {}
