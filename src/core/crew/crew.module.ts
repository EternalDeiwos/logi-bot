import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BotModule } from 'src/bot/bot.module';
import { RMQModule } from 'src/rmq/rmq.module';
import { Crew } from './crew.entity';
import { CrewMember } from './crew-member.entity';
import { CrewLog } from './crew-log.entity';
import { CrewShare } from './crew-share.entity';
import { CrewRepository } from './crew.repository';
import { CrewMemberRepository } from './crew-member.repository';
import { CrewLogRepository } from './crew-log.repository';
import { CrewShareRepository } from './crew-share.repository';
// import { CrewService } from './crew.service';
// import { CrewMemberService } from './crew-member.service';
// import { CrewLogService } from './crew-log.service';
// import { CrewShareService } from './crew-share.service';

@Module({
  imports: [BotModule, RMQModule, TypeOrmModule.forFeature([Crew, CrewMember, CrewLog, CrewShare])],
  providers: [
    CrewRepository,
    // CrewService,
    CrewMemberRepository,
    // CrewMemberService,
    CrewLogRepository,
    // CrewLogService,
    CrewShareRepository,
    // CrewShareService,
  ],
  // exports: [CrewService, CrewMemberService, CrewLogService, CrewShareService],
})
export class CrewModule {}
