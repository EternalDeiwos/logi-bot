import { Column, JoinColumn, ManyToOne, RelationId, ViewEntity } from 'typeorm';
import { Expose, Transform, Type } from 'class-transformer';
import { Snowflake } from 'discord.js';
import { Guild } from 'src/core/guild/guild.entity';
import { War } from 'src/game/war/war.entity';
import { StockpileLog } from './stockpile-log.entity';
import { Stockpile } from './stockpile.entity';
import { StockpileEntry } from './stockpile-entry.entity';
import { ExpandedCatalog } from 'src/game/catalog/catalog.entity';
import { IPostgresInterval } from 'postgres-interval';

@ViewEntity({
  name: 'stockpile_diff',
  expression: `
    SELECT
      entry1.id current_entry_id,
      entry2.id previous_entry_id,
      history.current_log_id,
      history.previous_log_id,
      history.stockpile_id,
      entry1.catalog_id,
      entry1.guild_id,
      entry1.war_number,
      entry1.quantity_crated,
      entry1.quantity_shippable,
      entry1.quantity_uncrated,
      history.created_at,
      entry1.created_by_sf,
      history.since_previous,
      COALESCE(entry1.quantity_crated - entry2.quantity_crated, entry1.quantity_crated) as diff_crated,
      COALESCE(entry1.quantity_shippable - entry2.quantity_shippable, entry1.quantity_shippable) as diff_shippable,
      COALESCE(entry1.quantity_uncrated - entry2.quantity_uncrated, entry1.quantity_uncrated) as diff_uncrated
    FROM
      (
        SELECT
          h1.stockpile_id stockpile_id,
          h1.log_id current_log_id,
          h2.log_id previous_log_id,
          h1.created_at created_at,
          COALESCE(h1.created_at - h2.created_at, '0'::interval) since_previous
        FROM app.stockpile_log_history h1,
        LATERAL (
          SELECT *
          FROM app.stockpile_log_history hh2
          WHERE hh2.rank=h1.rank+1 AND hh2.stockpile_id=h1.stockpile_id
        ) h2
      ) history
    LEFT JOIN app.stockpile_entry entry1 
      ON entry1.log_id=history.current_log_id 
      AND entry1.stockpile_id=history.stockpile_id
    LEFT JOIN app.stockpile_entry entry2 
      ON entry2.log_id=history.previous_log_id 
      AND entry1.catalog_id=entry2.catalog_id 
      AND entry1.stockpile_id=entry2.stockpile_id
  `,
})
export class StockpileDiff {
  @Column({ type: 'uuid', name: 'current_entry_id' })
  @RelationId((diff: StockpileDiff) => diff.currentEntry)
  currentEntryId: string;

  @ManyToOne(() => StockpileEntry)
  @Expose()
  @Type(() => StockpileEntry)
  @Transform(({ value }) => (value ? value : null))
  @JoinColumn({
    name: 'current_entry_id',
    referencedColumnName: 'id',
  })
  currentEntry: StockpileEntry;

  @Column({ type: 'uuid', name: 'previous_entry_id', nullable: true })
  @RelationId((diff: StockpileDiff) => diff.previousEntry)
  previousEntryId: string;

  @ManyToOne(() => StockpileEntry)
  @Expose()
  @Type(() => StockpileEntry)
  @Transform(({ value }) => (value ? value : null))
  @JoinColumn({
    name: 'previous_entry_id',
    referencedColumnName: 'id',
  })
  previousEntry: StockpileEntry;

  @Column({ type: 'uuid', name: 'current_log_id' })
  @RelationId((diff: StockpileDiff) => diff.currentLog)
  currentLogId: string;

  @ManyToOne(() => StockpileLog)
  @Expose()
  @Type(() => StockpileLog)
  @Transform(({ value }) => (value ? value : null))
  @JoinColumn({
    name: 'current_log_id',
    referencedColumnName: 'id',
  })
  currentLog: StockpileLog;

  @Column({ type: 'uuid', name: 'previous_log_id', nullable: true })
  @RelationId((diff: StockpileDiff) => diff.previousLog)
  previousLogId: string;

  @ManyToOne(() => StockpileLog)
  @Expose()
  @Type(() => StockpileLog)
  @Transform(({ value }) => (value ? value : null))
  @JoinColumn({
    name: 'previous_log_id',
    referencedColumnName: 'id',
  })
  previousLog: StockpileLog;

  @Column({ type: 'uuid', name: 'stockpile_id' })
  @RelationId((diff: StockpileDiff) => diff.stockpile)
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

  @Column({ type: 'uuid', name: 'catalog_id' })
  @RelationId((diff: StockpileDiff) => diff.catalog)
  catalogId: string;

  @ManyToOne(() => ExpandedCatalog)
  @Expose()
  @Type(() => ExpandedCatalog)
  @Transform(({ value }) => (value ? value : null))
  @JoinColumn({
    name: 'catalog_id',
    referencedColumnName: 'id',
  })
  catalog: ExpandedCatalog;

  @Expose()
  @Column({ type: 'uuid', name: 'guild_id' })
  @RelationId((diff: StockpileDiff) => diff.guild)
  guildId: string;

  @ManyToOne(() => Guild)
  @JoinColumn({
    name: 'guild_id',
    referencedColumnName: 'id',
  })
  guild: Guild;

  @Expose()
  @Column({ type: 'int8', name: 'war_number' })
  @RelationId((diff: StockpileDiff) => diff.war)
  warNumber: string;

  @ManyToOne(() => War)
  @JoinColumn({
    name: 'war_number',
    referencedColumnName: 'warNumber',
  })
  war: War;

  @Expose()
  @Column({ type: 'int4', name: 'quantity_uncrated' })
  currentQuantity: number;

  @Expose()
  @Column({ type: 'int4', name: 'quantity_crated' })
  currentQuantityCrated: number;

  @Expose()
  @Column({ type: 'int4', name: 'quantity_shippable' })
  currentQuantityShippable: number;

  @Expose()
  @Column({ type: 'int4', name: 'diff_uncrated' })
  diff: number;

  @Expose()
  @Column({ type: 'int4', name: 'diff_crated' })
  diffCrated: number;

  @Expose()
  @Column({ type: 'int4', name: 'diff_shippable' })
  diffShippable: number;

  @Expose()
  @Column({ type: 'int8', name: 'created_by_sf' })
  createdBy: Snowflake;

  @Expose()
  @Column({ type: 'timestamptz', name: 'created_at' })
  createdAt: Date;

  @Expose()
  @Column({ type: 'interval', name: 'since_previous' })
  sincePrevious: IPostgresInterval;

  getDiff(): string {
    const counts = [];

    if (this.diffShippable) {
      counts.push(`${this.diffShippable > 0 ? '+' : ''}${this.diffShippable}sc`);
    }

    if (this.diffCrated) {
      counts.push(`${this.diffCrated > 0 ? '+' : ''}${this.diffCrated}c`);
    }

    if (this.diff) {
      counts.push(`${this.diff > 0 ? '+' : ''}${this.diff}`);
    }

    return counts.length ? counts.join(', ') : 'No change';
  }

  getValue(): string {
    const counts = [];

    if (this.currentQuantityShippable) {
      counts.push(`${this.currentQuantityShippable}sc`);
    }

    if (this.currentQuantityCrated) {
      counts.push(`${this.currentQuantityCrated}c`);
    }

    if (this.currentQuantity) {
      counts.push(this.currentQuantity);
    }

    return counts.length ? counts.join(' + ') : 'None';
  }
}
