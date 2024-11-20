import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BotModule } from 'src/bot/bot.module';
import { AccessEntry } from './access.entity';
import { AccessEntryRepository } from './access.repository';
import { AccessService, AccessServiceImpl } from './access.service';
import { AccessCommand } from './access.command';

@Module({
  imports: [BotModule, TypeOrmModule.forFeature([AccessEntry])],
  providers: [
    AccessEntryRepository,
    AccessCommand,
    { provide: AccessService, useClass: AccessServiceImpl },
  ],
  exports: [AccessService],
})
export class AccessModule {}
