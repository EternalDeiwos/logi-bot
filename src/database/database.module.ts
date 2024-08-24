import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import * as migrations from './migrations';
import { MigrationKillSwitch } from './migrations.service';

@Module({
  imports: [
    ConfigModule,
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        host: configService.getOrThrow<string>('POSTGRES_HOST'),
        port: configService.getOrThrow<number>('POSTGRES_PORT'),
        username: configService.getOrThrow<string>('POSTGRES_USER'),
        password: configService.getOrThrow<string>('POSTGRES_PASSWORD'),
        database: configService.getOrThrow<string>('POSTGRES_DB'),
        schema: configService.getOrThrow<string>('POSTGRES_SCHEMA'),
        autoLoadEntities: true,
        migrations,
        migrationsTableName: 'migrations_history',
        migrationsRun: configService.getOrThrow<boolean>('POSTGRES_MIGRATE'),
        synchronize: configService.getOrThrow<string>('NODE_ENV') === 'development',
        logging: configService.getOrThrow<string>('NODE_ENV') === 'development' ? 'all' : undefined,
      }),
    }),
  ],
  providers: [MigrationKillSwitch],
})
export class DatabaseModule {}
