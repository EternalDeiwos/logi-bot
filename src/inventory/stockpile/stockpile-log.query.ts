import { Repository } from 'typeorm';
import { CommonQueryBuilder } from 'src/database/util';
import { SelectStockpileLog, StockpileLog } from './stockpile-log.entity';
import { SelectPoi } from 'src/game/poi/poi.entity';
import { SelectCrew } from 'src/core/crew/crew.entity';

export class StockpileLogQueryBuilder extends CommonQueryBuilder<StockpileLog> {
  constructor(repo: Repository<StockpileLog>) {
    super(repo, 'log');
  }

  byLog(logRef: SelectStockpileLog | SelectStockpileLog[]) {
    if (!Array.isArray(logRef)) {
      logRef = [logRef];
    }

    this.qb.andWhere('log.id IN (:...logs)', { logs: logRef.map((l) => l.id) });

    return this;
  }

  byLocation(poiRef: SelectPoi | SelectPoi[]) {
    if (!Array.isArray(poiRef)) {
      poiRef = [poiRef];
    }

    this.qb.andWhere('log.location_id IN (:...poi)', { poi: poiRef.map((c) => c.id) });

    return this;
  }

  byCrew(crewRef: SelectCrew | SelectCrew[]) {
    if (!Array.isArray(crewRef)) {
      crewRef = [crewRef];
    }

    this.qb.andWhere('log.crew_channel_sf IN (:...crews)', {
      crews: crewRef.map((c) => c.crewSf),
    });

    return this;
  }

  withPoi() {
    this.qb.leftJoinAndSelect('log.expandedLocation', 'poi');
    return this;
  }

  withStockpiles() {
    this.qb.leftJoinAndSelect('poi.stockpiles', 'stockpile');
    return this;
  }

  withEntries() {
    this.qb.leftJoinAndSelect('log.entries', 'entry');
    return this;
  }

  withCrew() {
    this.qb.leftJoinAndSelect('log.crew', 'crew');
    return this;
  }

  withGuild() {
    this.qb.leftJoinAndSelect('log.guild', 'guild');
    return this;
  }

  withAccessRules() {
    this.qb
      .leftJoinAndSelect('stockpile.access', 'access')
      .leftJoinAndSelect('access.rule', 'rule');
    return this;
  }

  withDiff() {
    this.qb
      .leftJoinAndSelect('log.diff', 'diff')
      .leftJoinAndSelect('diff.stockpile', 'diff_stockpile');
    return this;
  }

  withDiffCatalog() {
    this.qb.leftJoinAndSelect('diff.catalog', 'diff_catalog');
    return this;
  }
}
