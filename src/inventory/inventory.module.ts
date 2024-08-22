import { Module } from '@nestjs/common';
import { StockpileModule } from './stockpile/stockpile.module';

@Module({
  imports: [StockpileModule],
  providers: [],
  exports: [],
})
export class InventoryModule {}
