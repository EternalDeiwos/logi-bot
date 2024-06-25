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
    return this.createQueryBuilder('template').where(`name ILIKE :query AND guild_sf = :guild`, {
      query: `%${query}%`,
      guild: guildRef,
    });
  }
}
