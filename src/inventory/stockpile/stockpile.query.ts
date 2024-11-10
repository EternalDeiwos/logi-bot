import { Brackets, Repository } from 'typeorm';
import { CommonQueryBuilder } from 'src/database/util';
import { SelectStockpile, Stockpile } from './stockpile.entity';
import { SelectPoi } from 'src/game/poi/poi.entity';

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

  search(query: string) {
    this.qb.andWhere(searchWhere(), { query: `%${query}%` });
    return this;
  }

  withPoi() {
    this.qb.leftJoinAndSelect('stockpile.location', 'poi');
    return this;
  }

  withRegion() {
    this.qb.leftJoinAndSelect('poi.region', 'region');
    return this;
  }

  withEntries() {
    this.qb.leftJoinAndSelect('stockpile.items', 'entry');
    return this;
  }
}
