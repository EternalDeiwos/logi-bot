import { PickType } from '@nestjs/swagger';
import { CrewMember } from './crew-member.entity';

export class CrewMemberDto extends PickType(CrewMember, [
  'name',
  'access',
  'createdAt',
  'deletedAt',
  'memberSf',
] as const) {}
