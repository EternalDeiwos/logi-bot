import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { ConfigModule } from '@nestjs/config';
import { validationSchema } from './app.config';
import { AppModule } from './app.module';
import { PollingModule } from './polling/polling.module';

@Module({
  imports: [
    ScheduleModule.forRoot(),
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
    AppModule,
    PollingModule,
  ],
  providers: [],
  exports: [],
})
export class ServerModule {}
