import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { CommonRepository } from 'src/database/util';
import { Guild, GuildConfig, SelectGuild } from './guild.entity';

@Injectable()
export class GuildRepository extends CommonRepository<Guild> {
  constructor(private readonly dataSource: DataSource) {
    super(Guild, dataSource.createEntityManager());
  }

  public setConfig<T extends keyof GuildConfig>(guild: SelectGuild, key: T, value: GuildConfig[T]) {
    return this.createQueryBuilder('guild')
      .update()
      .set({
        config: () => `config || '${JSON.stringify({ [key]: value })}'::jsonb`,
      })
      .where('guild_sf=:guildSf', guild)
      .andWhere('deleted_at IS NULL')
      .returning('*')
      .execute();
  }
}
