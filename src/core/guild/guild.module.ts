import { forwardRef, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BotModule } from 'src/bot/bot.module';
import { RMQModule } from 'src/rmq/rmq.module';
import { AccessModule } from 'src/core/access/access.module';
import { Guild } from './guild.entity';
import { GuildSetting } from './guild-setting.entity';
import { GuildAccess } from './guild-access.entity';
import { GuildRepository } from './guild.repository';
import { GuildSettingRepository } from './guild-setting.repository';
import { GuildAccessRepository } from './guild-access.repository';
import { GuildCommand } from './guild.command';
import { GuildService, GuildServiceImpl } from './guild.service';

@Module({
  imports: [
    RMQModule,
    BotModule,
    forwardRef(() => AccessModule),
    TypeOrmModule.forFeature([Guild, GuildSetting, GuildAccess]),
  ],
  providers: [
    GuildRepository,
    GuildSettingRepository,
    GuildAccessRepository,
    GuildCommand,
    { provide: GuildService, useClass: GuildServiceImpl },
  ],
  exports: [GuildService],
})
export class GuildModule {}
