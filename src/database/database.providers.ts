import { join } from 'path';
import { DataSource } from 'typeorm';
import { Config, ConfigService } from 'src/config';
import {
  DataSourceProvider,
  QueryRunnerCallback,
  QueryRunnerFactoryProvider,
} from '.';

export const databaseProviders = [
  {
    provide: DataSourceProvider,
    inject: [ConfigService],
    useFactory: async (configService: ConfigService) => {
      const dataSource = new DataSource({
        type: 'postgres',
        host: configService.getOrThrow<string>(Config.POSTGRES_HOST),
        port: configService.getOrThrow<number>(Config.POSTGRES_PORT),
        username: configService.getOrThrow<string>(Config.POSTGRES_USER),
        password: configService.getOrThrow<string>(Config.POSTGRES_PASSWORD),
        database: configService.getOrThrow<string>(Config.POSTGRES_DB),
        schema: configService.getOrThrow<string>(Config.POSTGRES_SCHEMA),
        entities: [join('dist', 'src', '**', '*.entity.{ts,js}')],
        synchronize:
          configService.getOrThrow<string>(Config.NODE_ENV) !== 'production',
      });

      return dataSource.initialize();
    },
  },
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
    inject: [DataSourceProvider],
  },
];
