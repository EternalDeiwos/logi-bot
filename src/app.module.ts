import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { NecordPaginationModule } from '@necord/pagination';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { NecordModule } from 'necord';
import { IntentsBitField } from 'discord.js';
import { InventoryModule } from './inventory/inventory.module';
import { DiscordModule } from './discord/discord.module';
import { GameModule } from './game/game.module';
import { PermissionsService } from './permissions.service';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { MigrationKillSwitch as MigrationService } from './migrations.service';
import * as migrations from './database/migrations';

@Module({
  imports: [
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
    NecordModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        token: configService.getOrThrow<string>('DISCORD_BOT_TOKEN'),
        development: configService.getOrThrow<string>('APP_GUILD_ID').split(','),
        intents: [
          IntentsBitField.Flags.Guilds,
          IntentsBitField.Flags.GuildMembers,
          IntentsBitField.Flags.GuildMessages,
          IntentsBitField.Flags.MessageContent,
          IntentsBitField.Flags.GuildPresences,
        ],
      }),
    }),
    NecordPaginationModule.forRoot({
      buttons: {},
      allowSkip: true,
      allowTraversal: true,
    }),
    GameModule,
    DiscordModule,
    InventoryModule,
  ],
  controllers: [AppController],
  providers: [MigrationService, PermissionsService, AppService],
  exports: [],
})
export class AppModule {}
