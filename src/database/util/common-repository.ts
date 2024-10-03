import { Injectable } from '@nestjs/common';
import { FindOptionsWhere, InsertQueryBuilder, Repository } from 'typeorm';
import { QueryDeepPartialEntity } from 'typeorm/query-builder/QueryPartialEntity.js';

@Injectable()
export class CommonRepository<Entity> extends Repository<Entity> {
  public insertReturning(values: Parameters<InsertQueryBuilder<Entity>['values']>[0]) {
    return this.createQueryBuilder().insert().values(values).returning('*').execute();
  }

  public updateReturning(
    criteria: FindOptionsWhere<Entity>,
    partialEntity: QueryDeepPartialEntity<Entity>,
  ) {
    return this.createQueryBuilder()
      .update()
      .set(partialEntity)
      .where(criteria)
      .returning('*')
      .execute();
  }
}
