import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { CommonRepository } from 'src/database/util';
import { ForumTag } from './tag.entity';

@Injectable()
export class TagRepository extends CommonRepository<ForumTag> {
  constructor(private readonly dataSource: DataSource) {
    super(ForumTag, dataSource.createEntityManager());
  }
}
