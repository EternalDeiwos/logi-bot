import { Brackets, Repository } from 'typeorm';
import { CommonQueryBuilder } from 'src/database/util';
import { PoiMarkerType } from 'src/game/poi/poi.entity';
import { CurrentRegion, SelectRegion } from './region.entity';

const searchWhere = (alias: string = 'region') => {
  return new Brackets((qb) =>
    qb
      .where(`${alias}.hex_name ILIKE :query`)
      .orWhere(`${alias}.major_name ILIKE :query`)
      .orWhere(`${alias}.minor_name ILIKE :query`),
  );
};

export class RegionQueryBuilder extends CommonQueryBuilder<CurrentRegion> {
  constructor(repo: Repository<CurrentRegion>) {
    super(repo, 'region');
  }

  byRegion(regionRef: SelectRegion | SelectRegion[]) {
    if (!Array.isArray(regionRef)) {
      regionRef = [regionRef];
    }

    this.qb.andWhere('region.id IN (:...region)', {
      region: regionRef.map((c) => c.id),
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

  withPoi() {
    this.qb.innerJoinAndSelect('region.poi', 'poi');
    return this;
  }

  order() {
    this.qb.addOrderBy('region.major_name');
    return this;
  }
}
