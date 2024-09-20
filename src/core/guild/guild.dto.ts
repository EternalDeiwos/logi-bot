import { PickType } from '@nestjs/swagger';
import { Guild } from './guild.entity';

export class GuildDto extends PickType(Guild, [
  'createdAt',
  'deletedAt',
  'guildSf',
  'icon',
  'name',
  'shortName',
] as const) {}
