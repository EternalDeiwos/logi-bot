import { Brackets, Repository } from 'typeorm';
import { CommonQueryBuilder } from 'src/database/util';
import { StockpileDiff } from './stockpile-diff.entity';
import { SelectStockpile } from './stockpile.entity';
import { SelectStockpileLog } from './stockpile-log.entity';
import { StockpileLogHistory } from './stockpile-history.entity';

export class StockpileLogDiffQueryBuilder extends CommonQueryBuilder<StockpileDiff> {
  constructor(repo: Repository<StockpileDiff>) {
    super(repo, 'diff');
    this.qb.andWhere(
      new Brackets((qb) => {
        qb.orWhere('diff.diff_crated != 0')
          .orWhere('diff.diff_shippable != 0')
          .orWhere('diff.diff_uncrated != 0');
      }),
    );
  }

  byStockpile(stockpileRef: SelectStockpile | SelectStockpile[]) {
    if (!Array.isArray(stockpileRef)) {
      stockpileRef = [stockpileRef];
    }

    this.qb.andWhere('diff.stockpile_id IN (:...stockpiles)', {
      stockpiles: stockpileRef.map((s) => s.id),
    });

    return this;
  }

  byLatestStockpileLog(stockpileRef: SelectStockpile | SelectStockpile[]) {
    if (!Array.isArray(stockpileRef)) {
      stockpileRef = [stockpileRef];
    }

    this.qb.innerJoinAndSelect(
      StockpileLogHistory,
      'history',
      'history.stockpile_id IN (:...stockpiles) AND diff.stockpile_id=history.stockpile_id AND history.rank=1 AND history.log_id=diff.current_log_id',
      { stockpiles: stockpileRef.map((s) => s.id) },
    );

    return this;
  }

  byCurrentLog(logRef: SelectStockpileLog | SelectStockpileLog[]) {
    if (!Array.isArray(logRef)) {
      logRef = [logRef];
    }

    this.qb.andWhere('diff.current_log_id IN (:...currentLogs)', {
      currentLogs: logRef.map((l) => l.id),
    });

    return this;
  }

  byPreviousLog(logRef: SelectStockpileLog | SelectStockpileLog[]) {
    if (!Array.isArray(logRef)) {
      logRef = [logRef];
    }

    this.qb.andWhere('diff.current_log_id IN (:...previousLogs)', {
      previousLogs: logRef.map((l) => l.id),
    });

    return this;
  }

  withStockpile() {
    this.qb.leftJoinAndSelect('diff.stockpile', 'stockpile');
    return this;
  }

  withLocation() {
    this.qb.leftJoinAndSelect('stockpile.expandedLocation', 'poi');
    return this;
  }

  withCatalog() {
    this.qb.leftJoinAndSelect('diff.catalog', 'catalog');
    return this;
  }

  withCurrentEntry() {
    this.qb.leftJoinAndSelect('diff.currentEntry', 'currentEntry');
    return this;
  }

  withPreviousEntry() {
    this.qb.leftJoinAndSelect('diff.previousEntry', 'previousEntry');
    return this;
  }

  withAccessRules() {
    this.qb
      .leftJoinAndSelect('stockpile.access', 'access')
      .leftJoinAndSelect('access.rule', 'rule');
    return this;
  }

  order() {
    this.qb.addOrderBy(
      `
      GREATEST(
        CASE WHEN "diff"."diff_uncrated"=0 THEN -9999999 ELSE "diff"."diff_uncrated" END,
        CASE WHEN "diff"."diff_crated"=0 THEN -9999999 ELSE "diff"."diff_crated" END,
        CASE WHEN "diff"."diff_shippable"=0 THEN -9999999 ELSE "diff"."diff_shippable" END
      )
      `,
      'DESC',
    );
    return this;
  }
}
