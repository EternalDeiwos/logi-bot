import { forwardRef, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BotModule } from 'src/bot/bot.module';
import { RMQModule } from 'src/rmq/rmq.module';
import { WarModule } from 'src/game/war/war.module';
import { ApiModule } from './api/api.module';
import { GuildModule } from './guild/guild.module';
import { Team } from './team/team.entity';
import { Crew } from './crew/crew.entity';
import { CrewMember } from './crew/member/crew-member.entity';
import { Ticket } from './ticket/ticket.entity';
import { CrewLog } from './crew/log/crew-log.entity';
import { Guild } from './guild/guild.entity';
import { CrewShare } from './crew/share/crew-share.entity';
import { BotEventListener } from './bot.listener';
import { TeamService, TeamServiceImpl } from './team/team.service';
import { TeamCommand } from './team/team.command';
import { TeamRepository } from './team/team.repository';
import { CrewService, CrewServiceImpl } from './crew/crew.service';
import { CrewCommand } from './crew/crew.command';
import { CrewRepository } from './crew/crew.repository';
import { CrewMemberService, CrewMemberServiceImpl } from './crew/member/crew-member.service';
import { CrewMemberRepository } from './crew/member/crew-member.repository';
import { CrewLogService, CrewLogServiceImpl } from './crew/log/crew-log.service';
import { CrewLogRepository } from './crew/log/crew-log.repository';
import { CrewShareService, CrewShareServiceImpl } from './crew/share/crew-share.service';
import { CrewShareRepository } from './crew/share/crew-share.repository';
import { CrewAccess } from './crew/crew-access.entity';
import { CrewSetting } from './crew/crew-setting.entity';
import { CrewController } from './crew/crew.controller';
import { TicketService, TicketServiceImpl } from './ticket/ticket.service';
import { TicketCommand } from './ticket/ticket.command';
import { TicketRepository } from './ticket/ticket.repository';
import { TicketController } from './ticket/ticket.controller';
import { AccessModule } from './access/access.module';
import { CrewDiscordActionsResponseConsumer } from './crew/crew-discord-actions-response.consumer';
import { CrewAccessRepository } from './crew/crew-access.repository';
import { CrewSettingRepository } from './crew/crew-setting.repository';

@Module({
  imports: [
    RMQModule,
    BotModule,
    forwardRef(() => GuildModule),
    ApiModule,
    AccessModule,
    TypeOrmModule.forFeature([
      Team,
      Crew,
      CrewMember,
      CrewAccess,
      CrewSetting,
      Ticket,
      CrewLog,
      Guild,
      CrewShare,
    ]),
    WarModule,
  ],
  providers: [
    BotEventListener,
    TeamCommand,
    TeamRepository,
    CrewRepository,
    CrewCommand,
    CrewMemberRepository,
    CrewLogRepository,
    CrewShareRepository,
    CrewAccessRepository,
    CrewSettingRepository,
    TicketCommand,
    TicketRepository,
    CrewDiscordActionsResponseConsumer,
    { provide: TeamService, useClass: TeamServiceImpl },
    { provide: CrewService, useClass: CrewServiceImpl },
    { provide: CrewMemberService, useClass: CrewMemberServiceImpl },
    { provide: CrewLogService, useClass: CrewLogServiceImpl },
    { provide: CrewShareService, useClass: CrewShareServiceImpl },
    { provide: TicketService, useClass: TicketServiceImpl },
  ],
  controllers: [CrewController, TicketController],
  exports: [
    TypeOrmModule,
    ApiModule,
    TeamService,
    CrewService,
    CrewMemberService,
    CrewLogService,
    CrewShareService,
    TicketService,
  ],
})
export class CoreModule {}
