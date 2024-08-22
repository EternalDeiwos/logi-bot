import { Module } from '@nestjs/common';
import { WarModule } from 'src/game/war/war.module';
import { RegionModule } from 'src/game/region/region.module';
import { PoiModule } from 'src/game/poi/poi.module';
import { CatalogModule } from 'src/game/catalog/catalog.module';
import { PollingService } from './polling.service';

@Module({
  imports: [WarModule, RegionModule, PoiModule, CatalogModule],
  providers: [PollingService],
  exports: [],
})
export class PollingModule {}
