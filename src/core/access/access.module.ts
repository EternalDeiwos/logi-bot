import { forwardRef, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ApiModule } from 'src/core/api/api.module';
import { BotModule } from 'src/bot/bot.module';
import { GuildModule } from 'src/core/guild/guild.module';
import { CoreModule } from 'src/core/core.module';
import { AccessEntry } from './access.entity';
import { AccessEntryRepository } from './access.repository';
import { AccessService, AccessServiceImpl } from './access.service';
import { AccessCommand } from './access.command';
import { AccessEntryController } from './access.controller';

@Module({
  imports: [
    ApiModule,
    BotModule,
    forwardRef(() => GuildModule),
    forwardRef(() => CoreModule),
    TypeOrmModule.forFeature([AccessEntry]),
  ],
  providers: [
    AccessEntryRepository,
    AccessCommand,
    { provide: AccessService, useClass: AccessServiceImpl },
  ],
  controllers: [AccessEntryController],
  exports: [AccessService],
})
export class AccessModule {}
