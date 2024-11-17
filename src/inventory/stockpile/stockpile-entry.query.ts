import { Brackets, Repository } from 'typeorm';
import { CommonQueryBuilder } from 'src/database/util';
import { SelectStockpileLog } from './stockpile-log.entity';
import { SelectPoi } from 'src/game/poi/poi.entity';
import { SelectGuild } from 'src/core/guild/guild.entity';
import { SelectCatalog } from 'src/game/catalog/catalog.entity';
import { SelectStockpile } from './stockpile.entity';
import { StockpileEntry } from './stockpile-entry.entity';

type SelectCatalogId = Pick<SelectCatalog, 'id'>;

const searchWhere = (alias: string = 'catalog') => {
  return new Brackets((qb) => qb.where(`(${alias}.data->'DisplayName')::text ILIKE :query`));
};

export class StockpileEntryQueryBuilder extends CommonQueryBuilder<StockpileEntry> {
  constructor(
    repo: Repository<StockpileEntry>,
    private readonly gameVersion: string,
    private readonly catalogVersion: string,
  ) {
    super(repo, 'entry');
  }

  forCatalog(catalogVersion: string, gameVersion: string) {
    this.qb.andWhere(
      'catalog.foxhole_version=:gameVersion AND catalog.catalog_version=:catalogVersion',
      { gameVersion, catalogVersion },
    );
    return this;
  }

  forDefaultCatalog() {
    return this.forCatalog(this.catalogVersion, this.gameVersion);
  }

  byCatalog(catalogRef: SelectCatalogId | SelectCatalogId[]) {
    if (!Array.isArray(catalogRef)) {
      catalogRef = [catalogRef];
    }

    this.qb.andWhere('catalog.id IN (:...catalog)', { catalog: catalogRef.map((c) => c.id) });

    return this;
  }

  byIndividualCatalog(catalogRef: SelectCatalog | SelectCatalog[]) {
    if (!Array.isArray(catalogRef)) {
      catalogRef = [catalogRef];
    }

    catalogRef.forEach((catalog, idx) => {
      this.qb.andWhere(
        new Brackets((qb) => {
          qb.where(`catalog.foxhole_version=:${idx}gameVersion`)
            .andWhere(`catalog.catalog_version=:${idx}catalogVersion`)
            .andWhere(
              new Brackets((qb) => {
                if (catalog.id) {
                  qb.orWhere(`catalog.id=:${idx}id`);
                }

                if (catalog.name) {
                  qb.orWhere(`catalog.code_name=:${idx}name`);
                }
              }),
            );
        }),
        Object.fromEntries(Object.entries(catalog).map(([k, v]) => [`${idx}${k}`, v])),
      );
    });

    return this;
  }

  byCodeName(codeName: string | string[]) {
    if (!Array.isArray(codeName)) {
      codeName = [codeName];
    }

    this.qb.andWhere('catalog.code_name IN (:...codeName)', { codeName });

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
          qb.where('entry.guild_id IN (:...guilds)');
        }

        if (params.discordGuilds.length) {
          qb.orWhere('guild.guild_sf IN (:...discordGuilds)');
        }
      }),
      params,
    );

    return this;
  }

  byLocation(poiRef: SelectPoi | SelectPoi[]) {
    if (!Array.isArray(poiRef)) {
      poiRef = [poiRef];
    }

    this.qb.andWhere('log.location_id IN (:...poi)', { poi: poiRef.map((c) => c.id) });

    return this;
  }

  byLog(logRef: SelectStockpileLog | SelectStockpileLog[]) {
    if (!Array.isArray(logRef)) {
      logRef = [logRef];
    }

    this.qb.andWhere('entry.log_id IN (:...logs)', { logs: logRef.map((l) => l.id) });

    return this;
  }

  byStockpile(stockpileRef: SelectStockpile | SelectStockpile[]) {
    if (!Array.isArray(stockpileRef)) {
      stockpileRef = [stockpileRef];
    }

    this.qb.andWhere('entry.stockpile_id IN (:...stockpiles)', {
      stockpiles: stockpileRef.map((s) => s.id),
    });

    return this;
  }

  searchByCatalog(query: string) {
    this.qb.andWhere(searchWhere(), { query: `%${query}%` });
    return this;
  }

  withCatalog() {
    this.qb.leftJoinAndSelect('entry.expandedCatalog', 'catalog');
    return this;
  }

  withStockpile() {
    this.qb.leftJoinAndSelect('entry.stockpile', 'stockpile');
    return this;
  }

  withWar() {
    this.qb.leftJoinAndSelect('entry.war', 'war');
    return this;
  }

  withGuild() {
    this.qb.leftJoinAndSelect('entry.guild', 'guild');
    return this;
  }

  withLog() {
    this.qb.leftJoinAndSelect('entry.log', 'log');
    return this;
  }

  withPoi() {
    this.qb.leftJoinAndSelect('log.location', 'poi');
    return this;
  }

  withCrew() {
    this.qb.leftJoinAndSelect('log.crew', 'crew');
    return this;
  }

  withRegion() {
    this.qb.innerJoinAndSelect('poi.region', 'region');
    return this;
  }

  order() {
    this.qb
      .addOrderBy('catalog.category')
      .addOrderBy('catalog.display_name')
      .addOrderBy('region.major_name')
      .addOrderBy('stockpile.name');
    return this;
  }

  distinctOnCatalog() {
    this.qb.distinctOn(['catalog.id']);
    return this;
  }
}
