import { PickType } from '@nestjs/swagger';
import { CounterAccess } from 'src/inventory/counter/counter-access.entity';

export class InsertCounterAccessDto extends PickType(CounterAccess, [
  'ruleId',
  'counterId',
  'createdBy',
] as const) {}
