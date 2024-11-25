import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WarModule } from 'src/game/war/war.module';
import { CurrentRegion, Region } from './region.entity';
import { CurrentRegionRepository, RegionRepository } from './region.repository';
import { CurrentRegionLog, RegionLog } from './region-log.entity';
import { CurrentRegionLogRepository, RegionLogRepository } from './region-log.repository';
import { RegionService } from './region.service';
import { RegionRpcController } from './region-rpc.controller';
import { ApiModule } from 'src/core/api/api.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Region, CurrentRegion, RegionLog, CurrentRegionLog]),
    ApiModule,
    WarModule,
  ],
  providers: [
    RegionRepository,
    CurrentRegionRepository,
    RegionLogRepository,
    CurrentRegionLogRepository,
    RegionService,
  ],
  controllers: [RegionRpcController],
  exports: [RegionService],
})
export class RegionModule {}
