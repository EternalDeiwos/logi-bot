import { Injectable } from '@nestjs/common';
import { DatabaseError } from 'src/errors';
import { FindOneOptions, FindOptionsWhere, Repository } from 'typeorm';
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

  /**
   * @throws DatabaseError
   */
  public async findOneOrFail(options: FindOneOptions<Entity>): Promise<Entity> {
    try {
      return await super.findOneOrFail(options);
    } catch (err) {
      throw new DatabaseError('QUERY_FAILED', `Failed to find ${this.metadata.name}`, err);
    }
  }

  /**
   * @throws DatabaseError
   */
  public async findOneByOrFail(
    where: FindOptionsWhere<Entity> | FindOptionsWhere<Entity>[],
  ): Promise<Entity> {
    try {
      return await super.findOneByOrFail(where);
    } catch (err) {
      throw new DatabaseError('QUERY_FAILED', `Failed to find ${this.metadata.name}`, err);
    }
  }
}
