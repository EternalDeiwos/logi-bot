import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WarModule } from 'src/game/war/war.module';
import { RegionModule } from 'src/game/region/region.module';
import { CurrentPoi, Poi } from './poi.entity';
import { CurrentPoiRepository, PoiRepository } from './poi.repository';
import { PoiService } from './poi.service';

@Module({
  imports: [TypeOrmModule.forFeature([Poi, CurrentPoi]), WarModule, RegionModule],
  providers: [PoiRepository, CurrentPoiRepository, PoiService],
  exports: [PoiService],
})
export class PoiModule {}
