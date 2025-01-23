import { Repository } from 'typeorm';
import { CommonQueryBuilder } from 'src/database/util';
import { ForumTagTemplate } from './tag-template.entity';

export class TemplateQueryBuilder extends CommonQueryBuilder<ForumTagTemplate> {
  constructor(repo: Repository<ForumTagTemplate>) {
    super(repo, 'template');
    this.qb.leftJoinAndSelect('template.guild', 'guild');
  }

  search(query: string) {
    this.qb.andWhere('template.name ILIKE :query', { query: `%${query}%` });
    return this;
  }

  withTags() {
    this.qb.leftJoinAndSelect('template.tags', 'tag');
    return this;
  }

  withCrews() {
    this.qb.leftJoinAndSelect('template.crew', 'crew');
    return this;
  }

  withCrewTeams() {
    this.qb.leftJoinAndSelect('crew.team', 'crew_team');
    return this;
  }

  withTagTeams() {
    this.qb.leftJoinAndSelect('tag.team', 'team');
    return this;
  }
}
