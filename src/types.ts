import { QueryRunner } from 'typeorm';

export type QueryRunnerCallback<T> = (queryRunner: QueryRunner) => Promise<T>;
export type QueryRunnerFactory = <T>(fn: QueryRunnerCallback<T>) => Promise<T>;
