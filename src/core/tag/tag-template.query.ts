import { Repository } from 'typeorm';
import { CommonQueryBuilder } from 'src/database/util';
import { SelectGuild } from 'src/core/guild/guild.entity';
import { ForumTagTemplate } from './tag-template.entity';
import { SelectCrew } from '../crew/crew.entity';

export class TemplateQueryBuilder extends CommonQueryBuilder<ForumTagTemplate> {
  constructor(repo: Repository<ForumTagTemplate>) {
    super(repo, 'template');
    this.qb.leftJoinAndSelect('template.guild', 'guild');
  }

  byGuild(guildRef: SelectGuild) {
    if (guildRef.id) {
      this.qb.andWhere('template.guild_id=:id');
    } else {
      this.qb.andWhere('guild.guild_sf=:guildSf');
    }

    this.qb.setParameters(guildRef);
    return this;
  }

  byCrew(crewRef: SelectCrew) {
    this.qb.andWhere('template.crew_sf=:crewSf', crewRef);
    return this;
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
