import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { War } from './war.entity';
import { WarRepository } from './war.repository';
import { WarService } from './war.service';

@Module({
  imports: [TypeOrmModule.forFeature([War])],
  providers: [WarRepository, WarService],
  exports: [WarService],
})
export class WarModule {}
