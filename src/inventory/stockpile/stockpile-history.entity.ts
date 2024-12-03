import { Column, JoinColumn, ManyToOne, RelationId, ViewEntity } from 'typeorm';
import { Expose, Transform, Type } from 'class-transformer';
import { StockpileEntry } from './stockpile-entry.entity';
import { StockpileLog } from './stockpile-log.entity';
import { Stockpile } from './stockpile.entity';

@ViewEntity({
  name: 'stockpile_log_history',
  expression: (ds) =>
    ds
      .createQueryBuilder(StockpileEntry, 'entry')
      .distinctOn(['entry.stockpile_id', 'entry.log_id', 'l.created_at'])
      .select([
        'ROW_NUMBER() OVER (PARTITION BY entry.stockpile_id ORDER BY l.created_at DESC) AS rank',
        'entry.stockpile_id stockpile_id',
        'entry.log_id log_id',
        'l.created_at created_at',
      ])
      .withDeleted()
      .leftJoin('entry.log', 'l')
      .andWhere('l.deleted_at IS NULL')
      .groupBy('entry.stockpile_id')
      .addGroupBy('entry.log_id')
      .addGroupBy('l.created_at'),
})
export class StockpileLogHistory {
  @Column({ type: 'bigint', name: 'rank' })
  rank: string;

  @Column({ type: 'uuid', name: 'log_id' })
  @RelationId((history: StockpileLogHistory) => history.log)
  logId: string;

  @ManyToOne(() => StockpileLog)
  @Expose()
  @Type(() => StockpileLog)
  @Transform(({ value }) => (value ? value : null))
  @JoinColumn({
    name: 'log_id',
    referencedColumnName: 'id',
  })
  log: StockpileLog;

  @Column({ type: 'uuid', name: 'stockpile_id' })
  @RelationId((history: StockpileLogHistory) => history.stockpile)
  stockpileId: string;

  @ManyToOne(() => Stockpile)
  @Expose()
  @Type(() => Stockpile)
  @Transform(({ value }) => (value ? value : null))
  @JoinColumn({
    name: 'stockpile_id',
    referencedColumnName: 'id',
  })
  stockpile: Stockpile;

  @Expose()
  @Column({ type: 'timestamptz', name: 'created_at' })
  createdAt: Date;
}
