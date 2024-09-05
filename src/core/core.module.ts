import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { IntentsBitField } from 'discord.js';
import { NecordModule } from 'necord';
import { ConfigKey } from 'src/app.config';
import { Team } from './team/team.entity';
import { Crew } from './crew/crew.entity';
import { CrewMember } from './crew/member/crew-member.entity';
import { ForumTag } from './tag/tag.entity';
import { ForumTagTemplate } from './tag/tag-template.entity';
import { Ticket } from './ticket/ticket.entity';
import { CrewLog } from './crew/log/crew-log.entity';
import { Guild } from './guild/guild.entity';
import { CrewShare } from './crew/share/crew-share.entity';
import { BotEventListener } from './bot.listener';
import { TeamService } from './team/team.service';
import { TeamCommand } from './team/team.command';
import { TeamRepository } from './team/team.repository';
import { CrewService } from './crew/crew.service';
import { CrewCommand } from './crew/crew.command';
import { CrewRepository } from './crew/crew.repository';
import { CrewMemberService } from './crew/member/crew-member.service';
import { CrewMemberRepository } from './crew/member/crew-member.repository';
import { CrewLogService } from './crew/log/crew-log.service';
import { CrewLogRepository } from './crew/log/crew-log.repository';
import { CrewShareService } from './crew/share/crew-share.service';
import { CrewShareRepository } from './crew/share/crew-share.repository';
import { TagService } from './tag/tag.service';
import { TagCommand } from './tag/tag.command';
import { TagRepository } from './tag/tag.repository';
import { TagTemplateRepository } from './tag/tag-template.repository';
import { TicketService } from './ticket/ticket.service';
import { TicketCommand } from './ticket/ticket.command';
import { TicketRepository } from './ticket/ticket.repository';
import { GuildService } from './guild/guild.service';
import { GuildCommand } from './guild/guild.command';
import { GuildRepository } from './guild/guild.repository';

@Module({
  imports: [
    ConfigModule,
    NecordModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService<Record<ConfigKey, unknown>>) => ({
        token: configService.getOrThrow<string>('DISCORD_BOT_TOKEN'),
        development: configService.getOrThrow<string>('APP_GUILD_ID').split(','),
        intents: [IntentsBitField.Flags.Guilds, IntentsBitField.Flags.GuildMembers],
      }),
    }),
    TypeOrmModule.forFeature([
      Team,
      Crew,
      CrewMember,
      ForumTag,
      ForumTagTemplate,
      Ticket,
      CrewLog,
      Guild,
      CrewShare,
    ]),
  ],
  providers: [
    BotEventListener,
    TeamService,
    TeamCommand,
    TeamRepository,
    CrewRepository,
    CrewService,
    CrewCommand,
    CrewMemberRepository,
    CrewMemberService,
    CrewLogService,
    CrewLogRepository,
    CrewShareService,
    CrewShareRepository,
    TagService,
    TagCommand,
    TagRepository,
    TagTemplateRepository,
    TicketService,
    TicketCommand,
    TicketRepository,
    GuildRepository,
    GuildService,
    GuildCommand,
  ],
  exports: [TypeOrmModule],
})
export class CoreModule {}
