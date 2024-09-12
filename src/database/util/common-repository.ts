import { Injectable } from '@nestjs/common';
import { FindOptionsWhere, Repository } from 'typeorm';
import { QueryDeepPartialEntity } from 'typeorm/query-builder/QueryPartialEntity.js';

@Injectable()
export class CommonRepository<Entity> extends Repository<Entity> {
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
