import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { IntentsBitField } from 'discord.js';
import { NecordModule } from 'necord';
import { Config, ConfigModule, ConfigService } from 'src/config';
import { Team } from './team/team.entity';
import { Crew } from './crew/crew.entity';
import { CrewMember } from './crew/crew-member.entity';
import { ForumTag } from './tag/tag.entity';
import { ForumTagTemplate } from './tag/tag-template.entity';
import { Ticket } from './ticket/ticket.entity';
import { TeamService } from './team/team.service';
import { TeamCommand } from './team/team.command';
import { CrewService } from './crew/crew.service';
import { CrewCommand } from './crew/crew.command';
import { TagService } from './tag/tag.service';
import { TagCommand } from './tag/tag.command';
import { TicketService } from './ticket/ticket.service';
import { TicketCommand } from './ticket/ticket.command';
import { TicketCreateListener } from './ticket/ticket-create.listener';

@Module({
  imports: [
    ConfigModule,
    NecordModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        token: configService.getOrThrow<string>(Config.DISCORD_BOT_TOKEN),
        development:
          configService.getOrThrow<string>(Config.NODE_ENV) === 'production'
            ? []
            : [configService.getOrThrow<string>(Config.APP_GUILD_ID)],
        intents: [IntentsBitField.Flags.Guilds, IntentsBitField.Flags.GuildMembers],
      }),
    }),
    TypeOrmModule.forFeature([Team, Crew, CrewMember, ForumTag, ForumTagTemplate, Ticket]),
  ],
  providers: [
    TeamService,
    TeamCommand,
    CrewService,
    CrewCommand,
    TagService,
    TagCommand,
    TicketService,
    TicketCommand,
    TicketCreateListener,
  ],
  exports: [TypeOrmModule],
})
export class BotModule {}
