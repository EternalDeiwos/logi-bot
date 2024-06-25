import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { ForumTag } from './tag.entity';

@Injectable()
export class TagRepository extends Repository<ForumTag> {
  constructor(private readonly dataSource: DataSource) {
    super(ForumTag, dataSource.createEntityManager());
  }
}
