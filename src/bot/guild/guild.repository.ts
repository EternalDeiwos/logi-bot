import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { Guild } from './guild.entity';

@Injectable()
export class GuildRepository extends Repository<Guild> {
  constructor(private readonly dataSource: DataSource) {
    super(Guild, dataSource.createEntityManager());
  }

  public searchByName(query: string, exclude?: string) {
    const qb = this.createQueryBuilder('guild').where('guild.name ILIKE :query', {
      query: `%${query}%`,
    });

    if (exclude) {
      qb.andWhere('guild.guild != :exclude', { exclude });
    }

    return qb.getMany();
  }
}
