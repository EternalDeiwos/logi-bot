import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WarModule } from 'src/game/war/war.module';
import { RegionModule } from 'src/game/region/region.module';
import { ExpandedPoi, Poi } from './poi.entity';
import { ExpandedPoiRepository, PoiRepository } from './poi.repository';
import { PoiService, PoiServiceImpl } from './poi.service';

@Module({
  imports: [TypeOrmModule.forFeature([Poi, ExpandedPoi]), WarModule, RegionModule],
  providers: [
    PoiRepository,
    ExpandedPoiRepository,
    { provide: PoiService, useClass: PoiServiceImpl },
  ],
  exports: [PoiService],
})
export class PoiModule {}
