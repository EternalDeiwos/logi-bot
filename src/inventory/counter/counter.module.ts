import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AccessModule } from 'src/core/access/access.module';
import { WarModule } from 'src/game/war/war.module';
import { BotModule } from 'src/bot/bot.module';
import { GuildModule } from 'src/core/guild/guild.module';
import { CoreModule } from 'src/core/core.module';
import { CatalogModule } from 'src/game/catalog/catalog.module';
import { RMQModule } from 'src/rmq/rmq.module';
import { Counter, CurrentCounter } from './counter.entity';
import { CounterRepository, CurrentCounterRepository } from './counter.repository';
import { CounterService, CounterServiceImpl } from './counter.service';
import { CounterCommand } from './counter.command';
import { CounterRpcController } from './counter-rpc.controller';
import { CounterAccess } from './counter-access.entity';
import { CounterAccessRepository } from './counter-access.repository';
import { CounterEntry } from './counter-entry.entity';
import { CounterEntryRepository } from './counter-entry.repository';
import { CounterUpdateConsumer } from './counter-update.consumer';

@Module({
  imports: [
    TypeOrmModule.forFeature([Counter, CounterEntry, CounterAccess, CurrentCounter]),
    RMQModule,
    AccessModule,
    BotModule,
    GuildModule,
    CoreModule,
    WarModule,
    CatalogModule,
  ],
  providers: [
    CounterRepository,
    CurrentCounterRepository,
    CounterEntryRepository,
    CounterAccessRepository,
    { provide: CounterService, useClass: CounterServiceImpl },
    CounterCommand,
    CounterUpdateConsumer,
  ],
  controllers: [CounterRpcController],
  exports: [CounterService],
})
export class CounterModule {}
