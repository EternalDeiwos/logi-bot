import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BotModule } from 'src/bot/bot.module';
import { RMQModule } from 'src/rmq/rmq.module';
import { Team } from './team.entity';
import { TeamRepository } from './team.repository';
// import { TeamService } from './team.service';

@Module({
  imports: [BotModule, RMQModule, TypeOrmModule.forFeature([Team])],
  providers: [
    TeamRepository,
    // TeamService
  ],
  // exports: [TeamService],
})
export class TeamModule {}
