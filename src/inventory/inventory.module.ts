import { Module } from '@nestjs/common';
import { BotModule } from 'src/bot/bot.module';
import { GameModule } from 'src/game/game.module';
import { StockpileModule } from './stockpile/stockpile.module';

@Module({
  imports: [StockpileModule],
  providers: [],
  exports: [],
})
export class InventoryModule {}
