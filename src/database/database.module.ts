import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DataSource, QueryRunner } from 'typeorm';
import { QueryRunnerFactoryProvider } from 'src/constants';
import { Project, ProjectService } from 'src/database/project';

export type QueryRunnerCallback<T> = (queryRunner: QueryRunner) => Promise<T>;
export type QueryRunnerFactory = <T>(fn: QueryRunnerCallback<T>) => Promise<T>;

export const databaseProviders = [
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
];

@Module({
  imports: [TypeOrmModule.forFeature([Project])],
  providers: [...databaseProviders, ProjectService],
  exports: [...databaseProviders, ProjectService, TypeOrmModule],
})
export class DatabaseModule {}
