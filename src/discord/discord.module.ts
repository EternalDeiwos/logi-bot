import { Module } from '@nestjs/common';
import { RMQModule } from 'src/rmq.module';
import { GuildModule } from './guild/guild.module';

@Module({
  imports: [RMQModule, GuildModule],
  providers: [],
  exports: [],
})
export class DiscordModule {}
