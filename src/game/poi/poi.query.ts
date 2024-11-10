import { Brackets, Repository } from 'typeorm';
import { CommonQueryBuilder } from 'src/database/util';
import { CurrentPoi, PoiMarkerType, SelectPoi } from './poi.entity';

const searchWhere = (alias: string = 'poi') => {
  return new Brackets((qb) =>
    qb
      .where(`${alias}.hex_name ILIKE :query`)
      .orWhere(`${alias}.major_name ILIKE :query`)
      .orWhere(`${alias}.minor_name ILIKE :query`),
  );
};

export class PoiQueryBuilder extends CommonQueryBuilder<CurrentPoi> {
  constructor(repo: Repository<CurrentPoi>) {
    super(repo, 'poi');
  }

  byPoi(poiRef: SelectPoi | SelectPoi[]) {
    if (!Array.isArray(poiRef)) {
      poiRef = [poiRef];
    }

    this.qb.andWhere('poi.id IN (:...poi)', {
      poi: poiRef.map((c) => c.id),
    });

    return this;
  }

  onlyStorage() {
    this.qb.andWhere(`poi.marker_type IN (${PoiMarkerType.DEPOT}, ${PoiMarkerType.SEAPORT})`);
    return this;
  }

  onlySeaport() {
    this.qb.andWhere(`poi.marker_type=${PoiMarkerType.SEAPORT}`);

    return this;
  }

  onlyDepot() {
    this.qb.andWhere(`poi.marker_type=${PoiMarkerType.DEPOT}`);

    return this;
  }

  search(query: string) {
    this.qb.andWhere(searchWhere(), { query: `%${query}%` });
    return this;
  }

  withStockpiles() {
    this.qb.leftJoinAndSelect('poi.stockpiles', 'stockpile');
    return this;
  }

  withLogs() {
    this.qb.leftJoinAndSelect('poi.logs', 'log');
    return this;
  }
}
