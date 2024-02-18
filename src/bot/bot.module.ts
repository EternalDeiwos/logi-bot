import { IntentsBitField } from 'discord.js';
import { NecordModule } from 'necord';
import { DataSource } from 'typeorm';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Config, ConfigModule, ConfigService } from 'src/config';
import { QueryRunnerFactoryProvider } from 'src/constants';
import { QueryRunnerCallback } from 'src/types';
import { Project } from './models/project.entity';
import { Dashboard } from './models/dashboard.entity';
import { CreateDashboardCommand } from './commands/dashboard/create.command';

@Module({
  imports: [
    ConfigModule,
    NecordModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        token: configService.getOrThrow<string>(Config.DISCORD_BOT_TOKEN),
        development: [configService.getOrThrow<string>(Config.APP_GUILD_ID)],
        intents: [IntentsBitField.Flags.Guilds],
      }),
    }),
    TypeOrmModule.forFeature([Project, Dashboard]),
  ],
  providers: [
    {
      provide: QueryRunnerFactoryProvider,
      useFactory: (dataSource: DataSource) => {
        return async <T>(fn: QueryRunnerCallback<T>): Promise<T> => {
          const queryRunner = dataSource.createQueryRunner();
          await queryRunner.connect();
          const result = await fn(queryRunner);
          await queryRunner.release();
          return result;
        };
      },
      inject: [DataSource],
    },
    CreateDashboardCommand,
  ],
  exports: [TypeOrmModule],
})
export class BotModule {}
