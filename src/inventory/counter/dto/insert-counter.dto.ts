import { PickType } from '@nestjs/swagger';
import { Counter } from 'src/inventory/counter/counter.entity';

export class InsertCounterDto extends PickType(Counter, [
  'name',
  'kind',
  'guildId',
  'crewId',
  'createdBy',
] as const) {
  catalogId?: Counter['catalogId'];
}
