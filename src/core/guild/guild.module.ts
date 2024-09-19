import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BotModule } from 'src/bot/bot.module';
import { RMQModule } from 'src/rmq/rmq.module';
import { Guild } from './guild.entity';
import { GuildRepository } from './guild.repository';
import { GuildCommand } from './guild.command';
import { GuildService, GuildServiceImpl } from './guild.service';

@Module({
  imports: [RMQModule, BotModule, TypeOrmModule.forFeature([Guild])],
  providers: [GuildRepository, GuildCommand, { provide: GuildService, useClass: GuildServiceImpl }],
  exports: [GuildService],
})
export class GuildModule {}
