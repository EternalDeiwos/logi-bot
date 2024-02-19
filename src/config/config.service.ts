import { Injectable } from '@nestjs/common';
import { ConfigService as NestConfigService } from '@nestjs/config';

const config = {
  NODE_ENV: undefined,

  // Services config
  POSTGRES_HOST: 'localhost',
  POSTGRES_PORT: 5432,
  POSTGRES_USER: undefined,
  POSTGRES_PASSWORD: undefined,
  POSTGRES_DB: 'bot',
  POSTGRES_SCHEMA: 'app',
  REDIS_HOST: 'localhost',
  REDIS_PORT: 6379,
  REDIS_QUEUE_DB: 0,

  // Bot config
  DISCORD_BOT_TOKEN: undefined,
  DISCORD_BOT_CLIENT_ID: undefined,
  DISCORD_BOT_PERMISSIONS: '395137027136',
  DISCORD_BOT_SCOPE: 'bot applications.commands',

  // Application config
  APP_PORT: 8080,
  APP_GUILD_ID: undefined,
};

export type ConfigKey = keyof typeof config;

export const Config = Object.fromEntries(
  Object.keys(config).map((key) => [key, key]),
) as Record<ConfigKey, ConfigKey>;

@Injectable()
export class ConfigService {
  constructor(private configService: NestConfigService) {}

  get<T>(key: ConfigKey) {
    return this.configService.get<T>(key, config[key]);
  }

  getOrThrow<T>(key: ConfigKey) {
    return this.configService.getOrThrow<T>(key, config[key]);
  }
}
