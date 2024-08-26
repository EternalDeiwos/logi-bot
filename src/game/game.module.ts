import { Module } from '@nestjs/common';
import { WarModule } from './war/war.module';
import { CatalogModule } from './catalog/catalog.module';
import { RegionModule } from './region/region.module';
import { PoiModule } from './poi/poi.module';

@Module({
  imports: [WarModule, CatalogModule, RegionModule, PoiModule],
  providers: [],
  exports: [],
})
export class GameModule {}
