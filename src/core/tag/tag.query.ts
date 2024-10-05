import { Repository } from 'typeorm';
import { CommonQueryBuilder } from 'src/database/util';
import { SelectGuild } from 'src/core/guild/guild.entity';
import { ForumTag, SelectTag } from './tag.entity';
import { SelectTeam } from '../team/team.entity';

export class TagQueryBuilder extends CommonQueryBuilder<ForumTag> {
  constructor(repo: Repository<ForumTag>) {
    super(repo, 'tag');
    this.qb.leftJoinAndSelect('tag.guild', 'guild').leftJoinAndSelect('tag.template', 'template');
  }

  byTag(tagRef: SelectTag) {
    this.qb.andWhere('tag.tag_sf=:tagSf', tagRef);
    return this;
  }

  byTeam(teamRef: SelectTeam) {
    this.qb.andWhere('tag.team_id=:teamId', { teamId: teamRef.id });
    return this;
  }

  byGuild(guildRef: SelectGuild) {
    if (guildRef.id) {
      this.qb.andWhere('tag.guild_id=:id');
    } else {
      this.qb.andWhere('guild.guild_sf=:guildSf');
    }

    this.qb.setParameters(guildRef);
    return this;
  }

  search(query: string) {
    this.qb.andWhere('tag.name ILIKE :query', { query: `%${query}%` });
    return this;
  }

  withTeam() {
    this.qb.leftJoinAndSelect('tag.team', 'team');
    return this;
  }

  withCrews() {
    this.qb.leftJoinAndSelect('team.crews', 'crew');
    return this;
  }

  withTemplateTags() {
    this.qb.leftJoinAndSelect('template.tags', 'template_tags');
    return this;
  }
}
