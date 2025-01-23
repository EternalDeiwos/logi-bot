import { Repository } from 'typeorm';
import { CommonQueryBuilder } from 'src/database/util';
import { War } from './war.entity';

export class WarQueryBuilder extends CommonQueryBuilder<War> {
  constructor(repo: Repository<War>) {
    super(repo, 'war');
  }

  byCurrent() {
    this.qb.addSelect('war.war_number', 'war_number').orderBy('war.war_number', 'DESC').limit(1);
    return this;
  }
}
