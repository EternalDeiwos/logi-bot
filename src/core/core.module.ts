import { Module } from '@nestjs/common';
import { RMQModule } from 'src/rmq/rmq.module';
import { BotModule } from 'src/bot/bot.module';
import { GuildModule } from './guild/guild.module';

@Module({
  imports: [RMQModule, BotModule, GuildModule],
  providers: [],
  exports: [],
})
export class CoreModule {}
