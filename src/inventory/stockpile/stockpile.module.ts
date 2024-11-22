import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AccessModule } from 'src/core/access/access.module';
import { WarModule } from 'src/game/war/war.module';
import { BotModule } from 'src/bot/bot.module';
import { GuildModule } from 'src/core/guild/guild.module';
import { CoreModule } from 'src/core/core.module';
import { PoiModule } from 'src/game/poi/poi.module';
import { CatalogModule } from 'src/game/catalog/catalog.module';
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
import { StockpileUpdateConsumer } from './stockpile-update.consumer';
import { StockpileController } from './stockpile.controller';
import { StockpileRpcController } from './stockpile-rpc.controller';
import { StockpileAccess } from './stockpile-access.entity';
import { StockpileAccessRepository } from './stockpile-access.repository';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Stockpile,
      StockpileLog,
      StockpileEntry,
      CurrentStockpileEntry,
      StockpileAccess,
    ]),
    AccessModule,
    BotModule,
    GuildModule,
    CoreModule,
    WarModule,
    PoiModule,
    CatalogModule,
  ],
  providers: [
    StockpileRepository,
    StockpileLogRepository,
    StockpileEntryRepository,
    CurrentStockpileEntryRepository,
    StockpileAccessRepository,
    { provide: StockpileService, useClass: StockpileServiceImpl },
    StockpileUpdateConsumer,
    StockpileCommand,
  ],
  controllers: [StockpileController, StockpileRpcController],
  exports: [StockpileService],
})
export class StockpileModule {}
