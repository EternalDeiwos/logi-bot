import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { ForumTagTemplate } from './tag-template.entity';
import { Snowflake } from 'discord.js';

@Injectable()
export class TagTemplateRepository extends Repository<ForumTagTemplate> {
  constructor(private readonly dataSource: DataSource) {
    super(ForumTagTemplate, dataSource.createEntityManager());
  }

  public search(guildRef: Snowflake, query: string) {
    return this.createQueryBuilder('template')
      .leftJoin('template.guild', 'guild')
      .where(`template.name ILIKE :query AND guild.guild_sf = :guild`, {
        query: `%${query}%`,
        guild: guildRef,
      });
  }

  public getTemplateTagForumMap(templates: (string | ForumTagTemplate)[]) {
    return this.createQueryBuilder('template')
      .distinctOn(['tag.team_id'])
      .select('tag.team_id', 'teamId')
      .addSelect('jsonb_object_agg(tag.name, tag.tag_sf::varchar)', 'tags')
      .leftJoin('template.tags', 'tag')
      .where('tag.template IN (:...ids)', {
        ids: templates.map((template) => (typeof template === 'string' ? template : template?.id)),
      })
      .groupBy('tag.team_id')
      .getRawMany<{
        teamId: string;
        tags: Record<string, string>;
      }>();
  }
}
