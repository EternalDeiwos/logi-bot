import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BotModule } from 'src/bot/bot.module';
import { RMQModule } from 'src/rmq/rmq.module';
import { Guild } from './guild.entity';
import { GuildRepository } from './guild.repository';
import { GuildService } from './guild.service';
import { GuildCommand } from './guild.command';
import { GuildConsumer } from './guild.consumer';

@Module({
  imports: [BotModule, RMQModule, TypeOrmModule.forFeature([Guild])],
  providers: [GuildRepository, GuildService, GuildCommand, GuildConsumer],
  exports: [GuildService],
})
export class GuildModule {}
