import { Module } from '@nestjs/common';
import { BotModule } from 'src/bot/bot.module';
import { RMQModule } from 'src/rmq/rmq.module';
import { WarModule } from 'src/game/war/war.module';
import { RegionModule } from 'src/game/region/region.module';
import { PoiModule } from 'src/game/poi/poi.module';
import { CatalogModule } from 'src/game/catalog/catalog.module';
import { PollingService } from './polling.service';
import { BotEventListener } from './discord.listener';

@Module({
  imports: [BotModule, RMQModule, WarModule, RegionModule, PoiModule, CatalogModule],
  providers: [PollingService, BotEventListener],
  exports: [],
})
export class EventsModule {}
