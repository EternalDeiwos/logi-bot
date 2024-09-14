import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { ConfigModule } from '@nestjs/config';
import { DatabaseModule } from './database/database.module';
import { CoreModule } from 'src/core/core.module';
import { EventsModule } from 'src/events/events.module';
import { AppController } from './app.controller';
import { PermissionsService } from './permissions.service';
import { validationSchema } from './app.config';

@Module({
  imports: [
    DatabaseModule,
    // GameModule,
    CoreModule,
    // InventoryModule
  ],
  controllers: [AppController],
  providers: [PermissionsService],
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
