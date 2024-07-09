import { Module } from '@nestjs/common';
import { StockpileService } from './stockpile.service';

@Module({
  imports: [],
  providers: [StockpileService],
  exports: [StockpileService],
})
export class StockpileModule {}
