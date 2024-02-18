import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Config, ConfigModule, ConfigService } from 'src/config';
import { BotModule } from 'src/bot';
import { AppController } from './app.controller';
import { PermissionsService } from './permissions.service';
import { EventEmitterModule } from '@nestjs/event-emitter';

@Module({
  imports: [
    ConfigModule,
    EventEmitterModule.forRoot({
      wildcard: true,
      verboseMemoryLeak: true,
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        host: configService.getOrThrow<string>(Config.POSTGRES_HOST),
        port: configService.getOrThrow<number>(Config.POSTGRES_PORT),
        username: configService.getOrThrow<string>(Config.POSTGRES_USER),
        password: configService.getOrThrow<string>(Config.POSTGRES_PASSWORD),
        database: configService.getOrThrow<string>(Config.POSTGRES_DB),
        schema: configService.getOrThrow<string>(Config.POSTGRES_SCHEMA),
        autoLoadEntities: true,
        synchronize:
          configService.getOrThrow<string>(Config.NODE_ENV) !== 'production',
      }),
    }),
    BotModule,
  ],
  controllers: [AppController],
  providers: [PermissionsService],
})
export class AppModule {}
