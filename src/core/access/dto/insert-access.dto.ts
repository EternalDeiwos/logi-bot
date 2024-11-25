import { OmitType } from '@nestjs/swagger';
import { AccessEntry } from 'src/core/access/access.entity';

export class InsertAccessEntryDto extends OmitType(AccessEntry, [
  'id',
  'guild',
  'guildId',
  'updatedAt',
  'updatedBy',
  'deletedAt',
  'deletedBy',
] as const) {}
