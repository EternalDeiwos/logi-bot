import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WarModule } from 'src/game/war/war.module';
import { Stockpile } from './stockpile.entity';
import { StockpileRepository } from './stockpile.repository';
import { StockpileLog } from './stockpile-log.entity';
import { StockpileLogRepository } from './stockpile-log.repository';
import { StockpileService, StockpileServiceImpl } from './stockpile.service';
import { CurrentStockpileEntry, StockpileEntry } from './stockpile-entry.entity';
import { StockpileCommand } from './stockpile.command';
import {
  CurrentStockpileEntryRepository,
  StockpileEntryRepository,
} from './stockpile-entry.repository';
import { BotModule } from 'src/bot/bot.module';
import { PoiModule } from 'src/game/poi/poi.module';
import { GuildModule } from 'src/core/guild/guild.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Stockpile, StockpileLog, StockpileEntry, CurrentStockpileEntry]),
    BotModule,
    GuildModule,
    WarModule,
    PoiModule,
  ],
  providers: [
    StockpileRepository,
    StockpileLogRepository,
    StockpileEntryRepository,
    CurrentStockpileEntryRepository,
    { provide: StockpileService, useClass: StockpileServiceImpl },
    StockpileCommand,
  ],
  exports: [StockpileService],
})
export class StockpileModule {}
