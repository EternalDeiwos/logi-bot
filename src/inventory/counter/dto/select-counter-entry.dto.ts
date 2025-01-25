import { PickType } from '@nestjs/swagger';
import { CounterEntry } from 'src/inventory/counter/counter-entry.entity';

export class SelectCounterEntryDto extends PickType(CounterEntry, ['id'] as const) {}
