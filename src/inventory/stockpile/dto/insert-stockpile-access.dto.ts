import { PickType } from '@nestjs/swagger';
import { StockpileAccess } from 'src/inventory/stockpile/stockpile-access.entity';

export class InsertStockpileAccessDto extends PickType(StockpileAccess, [
  'ruleId',
  'stockpileId',
] as const) {}
