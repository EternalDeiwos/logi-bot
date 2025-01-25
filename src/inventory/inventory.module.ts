import { Module } from '@nestjs/common';
import { StockpileModule } from './stockpile/stockpile.module';
import { CounterModule } from './counter/counter.module';

@Module({
  imports: [StockpileModule, CounterModule],
  providers: [],
  exports: [],
})
export class InventoryModule {}
