import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WarModule } from 'src/game/war/war.module';
import { CurrentRegion, Region } from './region.entity';
import { CurrentRegionRepository, RegionRepository } from './region.repository';
import { CurrentRegionLog, RegionLog } from './region-log.entity';
import { CurrentRegionLogRepository, RegionLogRepository } from './region-log.repository';
import { RegionService } from './region.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Region, CurrentRegion, RegionLog, CurrentRegionLog]),
    WarModule,
  ],
  providers: [
    RegionRepository,
    CurrentRegionRepository,
    RegionLogRepository,
    CurrentRegionLogRepository,
    RegionService,
  ],
  exports: [RegionService],
})
export class RegionModule {}
