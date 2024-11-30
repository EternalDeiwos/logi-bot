import { Brackets, Repository } from 'typeorm';
import { CommonQueryBuilder } from 'src/database/util';
import { SelectStockpile, Stockpile } from './stockpile.entity';
import { SelectPoi } from 'src/game/poi/poi.entity';
import { SelectCatalog } from 'src/game/catalog/catalog.entity';
import { SelectGuild } from 'src/core/guild/guild.entity';

const searchWhere = (alias: string = 'stockpile') => {
  return new Brackets((qb) => qb.where(`${alias}.name ILIKE :query`));
};

export class StockpileQueryBuilder extends CommonQueryBuilder<Stockpile> {
  constructor(repo: Repository<Stockpile>) {
    super(repo, 'stockpile');
  }

  byLocation(poiRef: SelectPoi | SelectPoi[]) {
    if (!Array.isArray(poiRef)) {
      poiRef = [poiRef];
    }

    this.qb.andWhere('stockpile.location_id IN (:...poi)', { poi: poiRef.map((c) => c.id) });

    return this;
  }

  byStockpile(stockpileRef: SelectStockpile | SelectStockpile[]) {
    if (!Array.isArray(stockpileRef)) {
      stockpileRef = [stockpileRef];
    }

    this.qb.andWhere('stockpile.id IN (:...stockpiles)', {
      stockpiles: stockpileRef.map((c) => c.id),
    });

    return this;
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
          qb.where('stockpile.guild_id IN (:...guilds)');
        }

        if (params.discordGuilds.length) {
          qb.orWhere('guild.guild_sf IN (:...discordGuilds)');
        }
      }),
      params,
    );

    return this;
  }

  byContents(catalogRef: SelectCatalog | SelectCatalog[]) {
    if (!Array.isArray(catalogRef)) {
      catalogRef = [catalogRef];
    }

    this.qb.andWhere('entry.catalog_id IN (:...catalogs)', {
      catalogs: catalogRef.map((c) => c.id),
    });

    return this;
  }

  /**
   * Exclude stockpile entries by stockpile by code name
   */
  unsafe_excludeStockpileEntries(groups: { [stockpileId: string]: string[] }) {
    this.qb.andWhere(
      new Brackets((qb) => {
        for (const [stockpileId, codeName] of Object.entries(groups)) {
          qb.orWhere(
            new Brackets((qb) => {
              const discriminator = `${stockpileId.replaceAll('-', '')}_excludeCodeName`;
              qb.andWhere(`stockpile.id='${stockpileId}'`).andWhere(
                `catalog.code_name NOT IN (:...${discriminator})`,
                {
                  [discriminator]: codeName,
                },
              );
            }),
          );
        }
      }),
    );
    return this;
  }

  withoutNilEntries() {
    this.qb.andWhere(
      new Brackets((qb) =>
        qb
          .where('entry.quantity_uncrated > 0')
          .orWhere('entry.quantity_crated > 0')
          .orWhere('entry.quantity_shippable > 0'),
      ),
    );
    return this;
  }

  search(query: string) {
    this.qb.andWhere(searchWhere(), { query: `%${query}%` });
    return this;
  }

  withGuild() {
    this.qb.leftJoinAndSelect('stockpile.guild', 'guild');
    return this;
  }

  withPoi() {
    this.qb.innerJoinAndSelect('stockpile.expandedLocation', 'poi', 'poi.deleted_at IS NULL');
    return this;
  }

  withEntries() {
    this.qb.leftJoinAndSelect('stockpile.items', 'entry');
    return this;
  }

  withCurrentEntries() {
    this.qb.leftJoinAndSelect('stockpile.currentItems', 'entry');
    return this;
  }

  withLogs() {
    this.qb.leftJoinAndSelect('entry.log', 'log');
    return this;
  }

  withCatalog() {
    this.qb.leftJoinAndSelect('entry.expandedCatalog', 'catalog');
    return this;
  }

  withAccessRules() {
    this.qb
      .leftJoinAndSelect('stockpile.access', 'access')
      .leftJoinAndSelect('access.rule', 'rule');
    return this;
  }

  order() {
    this.qb.addOrderBy('poi.major_name').addOrderBy('stockpile.name');
    return this;
  }
}
