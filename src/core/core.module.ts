import { Module } from '@nestjs/common';
import { RMQModule } from 'src/rmq/rmq.module';
import { BotModule } from 'src/bot/bot.module';
import { GuildModule } from './guild/guild.module';
import { TeamModule } from './team/team.module';
import { TagModule } from './tag/tag.module';
import { CrewModule } from './crew/crew.module';
import { TicketModule } from './ticket/ticket.module';

@Module({
  imports: [RMQModule, BotModule, GuildModule, TeamModule, TagModule, CrewModule, TicketModule],
  providers: [],
  exports: [],
})
export class CoreModule {}
