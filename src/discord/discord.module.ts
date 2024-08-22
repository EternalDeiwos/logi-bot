import { Module } from '@nestjs/common';
import { GuildModule } from './guild/guild.module';

@Module({
  imports: [GuildModule],
  providers: [],
  exports: [],
})
export class DiscordModule {}
