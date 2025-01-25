import { PickType } from '@nestjs/swagger';
import { CounterEntry } from 'src/inventory/counter/counter-entry.entity';

export class InsertCounterEntryDto extends PickType(CounterEntry, [
  'counterId',
  'value',
  'createdBy',
] as const) {}
