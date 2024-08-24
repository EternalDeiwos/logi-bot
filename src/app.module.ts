import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { ConfigModule } from '@nestjs/config';
import { DatabaseModule } from './database/database.module';
import { InventoryModule } from './inventory/inventory.module';
import { CoreModule } from './core/core.module';
import { EventsModule } from './events/events.module';
import { GameModule } from './game/game.module';
import { PermissionsService } from './permissions.service';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { validationSchema } from './app.config';

@Module({
  imports: [DatabaseModule, GameModule, CoreModule, InventoryModule],
  controllers: [AppController],
  providers: [PermissionsService, AppService],
  exports: [],
})
export class AppModule {
  static getAppModules() {
    return [
      ConfigModule.forRoot({
        envFilePath: [
          '.env.local',
          `.env.${process.env.NODE_ENV}.local`,
          `.env.${process.env.NODE_ENV}`,
          '.env',
        ],
        isGlobal: true,
        cache: true,
        validationSchema,
      }),
      this,
    ];
  }

  static getServerModules() {
    return [...this.getAppModules(), ScheduleModule.forRoot(), EventsModule];
  }
}

@Module({
  imports: AppModule.getServerModules(),
})
export class ServerModule {}

@Module({
  imports: AppModule.getAppModules(),
})
export class ReplModule {}
