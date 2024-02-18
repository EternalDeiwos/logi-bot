import { Inject, Injectable } from '@nestjs/common';
import { QueryRunnerFactoryProvider } from 'src/constants';
import { QueryRunnerFactory } from 'src/database';

@Injectable()
export class ProjectService {
  constructor(
    @Inject(QueryRunnerFactoryProvider)
    private withQueryRunner: QueryRunnerFactory,
  ) {}
}
