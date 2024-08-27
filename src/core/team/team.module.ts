import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BotModule } from 'src/bot/bot.module';
import { RMQModule } from 'src/rmq/rmq.module';
import { Team } from './team.entity';
import { TeamRepository } from './team.repository';
import { TeamService } from './team.service';
import { TeamCommand } from './team.command';
import { TeamConsumer } from './team.consumer';
import { GuildModule } from '../guild/guild.module';

@Module({
  imports: [BotModule, RMQModule, TypeOrmModule.forFeature([Team]), GuildModule],
  providers: [TeamRepository, TeamService, TeamCommand, TeamConsumer],
  exports: [TeamService],
})
export class TeamModule {}
