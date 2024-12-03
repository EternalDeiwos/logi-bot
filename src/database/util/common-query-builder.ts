import { SelectGuild } from 'src/core/guild/guild.entity';
import { Brackets, ObjectLiteral, Repository, SelectQueryBuilder } from 'typeorm';

export abstract class CommonQueryBuilder<Entity extends ObjectLiteral> {
  protected readonly qb: SelectQueryBuilder<Entity>;

  constructor(
    private readonly repo: Repository<Entity>,
    protected readonly alias: string,
  ) {
    this.qb = repo.createQueryBuilder(alias);
  }

  byGuild(guildRef: SelectGuild | SelectGuild[]) {
    if (!Array.isArray(guildRef)) {
      guildRef = [guildRef];
    }

    const params = guildRef.reduce(
      (acc, g) => {
        if (g.id) acc.guilds.push(g.id);
        if (g.guildSf) acc.discordGuilds.push(g.guildSf);
        return acc;
      },
      { guilds: [], discordGuilds: [] },
    );

    this.qb.andWhere(
      new Brackets((qb) => {
        if (params.guilds.length) {
          qb.where(`${this.alias}.guild_id IN (:...guilds)`);
        }

        if (params.discordGuilds.length) {
          qb.orWhere('guild.guild_sf IN (:...discordGuilds)');
        }
      }),
      params,
    );

    return this;
  }

  withDeleted() {
    this.qb.withDeleted();
    return this;
  }

  limit(limit: number) {
    this.qb.limit(limit);
    return this;
  }

  getMany() {
    return this.qb.getMany();
  }

  getManyAndCount() {
    return this.qb.getManyAndCount();
  }

  getOneOrFail() {
    return this.qb.getOneOrFail();
  }

  getOne() {
    return this.qb.getOne();
  }

  getExists() {
    return this.qb.getExists();
  }

  getCount() {
    return this.qb.getCount();
  }
}
