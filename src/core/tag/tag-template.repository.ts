import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { Snowflake } from 'discord.js';
import { CommonRepository } from 'src/database/util';
import { ForumTagTemplate } from './tag-template.entity';

@Injectable()
export class TagTemplateRepository extends CommonRepository<ForumTagTemplate> {
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
