import { Inject, Logger, Module, OnApplicationBootstrap } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { Config, ConfigModule, ConfigService } from 'src/config';
import { BotModule } from 'src/core/bot.module';
import { AppController } from './app.controller';
import { PermissionsService } from './permissions.service';

@Module({
  imports: [
    ConfigModule,
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
        synchronize: configService.getOrThrow<string>(Config.NODE_ENV) !== 'production',
      }),
    }),
    BotModule,
  ],
  controllers: [AppController],
  providers: [PermissionsService],
})
export class AppModule implements OnApplicationBootstrap {
  private readonly logger = new Logger(AppModule.name);

  @Inject()
  private readonly configService: ConfigService;

  @Inject()
  private readonly dataSource: DataSource;

  async onApplicationBootstrap() {
    const env = this.configService.getOrThrow<string>(Config.NODE_ENV);
    this.logger.warn(`Running in ${env} mode`);

    if (env !== 'production') {
      return;
    }

    this.logger.log('Running migrations');
    return this.dataSource.runMigrations({
      transaction: 'all',
    });
  }
}
