import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WarModule } from 'src/game/war/war.module';
import { RegionModule } from 'src/game/region/region.module';
import { ExpandedPoi, Poi } from './poi.entity';
import { ExpandedPoiRepository, PoiRepository } from './poi.repository';
import { PoiService, PoiServiceImpl } from './poi.service';
import { PoiRpcController } from './poi-rpc.controller';
import { ApiModule } from 'src/core/api/api.module';

@Module({
  imports: [TypeOrmModule.forFeature([Poi, ExpandedPoi]), ApiModule, WarModule, RegionModule],
  providers: [
    PoiRepository,
    ExpandedPoiRepository,
    { provide: PoiService, useClass: PoiServiceImpl },
  ],
  controllers: [PoiRpcController],
  exports: [PoiService],
})
export class PoiModule {}
