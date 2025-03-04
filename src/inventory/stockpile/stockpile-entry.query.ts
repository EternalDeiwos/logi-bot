import { Brackets, Repository } from 'typeorm';
import { CommonQueryBuilder } from 'src/database/util';
import { SelectPoiDto } from 'src/game/poi/poi.entity';
import {
  CatalogCategory,
  CatalogCategoryNameMap,
  SelectCatalogDto,
} from 'src/game/catalog/catalog.entity';
import { SelectStockpile } from './stockpile.entity';
import { SelectStockpileLogDto } from './stockpile-log.entity';
import { CurrentStockpileEntry } from './stockpile-entry.entity';

type SelectCatalogId = Pick<SelectCatalogDto, 'id'>;

const searchWhere = (alias: string = 'catalog') => {
  return new Brackets((qb) =>
    qb.where(`${alias}.display_name ILIKE :query`).orWhere(`${alias}.category IN (:...categories)`),
  );
};

export class StockpileEntryQueryBuilder extends CommonQueryBuilder<CurrentStockpileEntry> {
  constructor(
    repo: Repository<CurrentStockpileEntry>,
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

  byIndividualCatalog(catalogRef: SelectCatalogDto | SelectCatalogDto[]) {
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

  byLocation(poiRef: SelectPoiDto | SelectPoiDto[]) {
    if (!Array.isArray(poiRef)) {
      poiRef = [poiRef];
    }

    this.qb.andWhere('log.location_id IN (:...poi)', { poi: poiRef.map((c) => c.id) });

    return this;
  }

  byLog(logRef: SelectStockpileLogDto | SelectStockpileLogDto[]) {
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

  searchByCatalog(query: string) {
    const q = query.toLowerCase();
    const categories = Object.entries(CatalogCategoryNameMap)
      .filter(([category, description]) => {
        return category.toLowerCase().includes(q) || description.toLowerCase().includes(q);
      })
      .map(([c]) => c) as CatalogCategory[];
    this.qb.andWhere(searchWhere(), { query: `%${q}%`, categories });
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
    this.qb.leftJoinAndSelect('log.expandedLocation', 'poi');
    return this;
  }

  withCrew() {
    this.qb.leftJoinAndSelect('log.crew', 'crew');
    return this;
  }

  withAccessRules() {
    this.qb
      .leftJoinAndSelect('stockpile.access', 'access')
      .leftJoinAndSelect('access.rule', 'rule');
    return this;
  }

  order() {
    this.qb
      .addOrderBy('catalog.category')
      .addOrderBy('catalog.display_name')
      .addOrderBy('catalog.id')
      .addOrderBy('poi.major_name')
      .addOrderBy('stockpile.name');
    return this;
  }

  distinctOnCatalog() {
    this.qb.distinctOn(['catalog.category', 'catalog.display_name', 'catalog.id']);
    return this;
  }
}
