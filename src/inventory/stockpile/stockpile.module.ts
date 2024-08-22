import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Stockpile } from './stockpile.entity';
import { StockpileRepository } from './stockpile.repository';
import { StockpileService } from './stockpile.service';
import { StockpileCommand } from './stockpile.command';
import { StockpileLogRepository } from './stockpile-log.repository';
import { StockpileLog } from './stockpile-log.entity';
import { StockpileEntryRepository } from './stockpile-entry.repository';
import { StockpileEntry } from './stockpile-entry.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Stockpile, StockpileLog, StockpileEntry])],
  providers: [
    StockpileRepository,
    StockpileLogRepository,
    StockpileEntryRepository,
    StockpileService,
    StockpileCommand,
  ],
  exports: [StockpileService],
})
export class StockpileModule {}
