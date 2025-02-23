import { OmitType, PartialType, PickType } from '@nestjs/swagger';
import { Expose, Transform, Type } from 'class-transformer';
import { Snowflake } from 'discord.js';
import {
  Entity,
  Column,
  Index,
  RelationId,
  ManyToOne,
  JoinColumn,
  ViewEntity,
  PrimaryColumn,
  CreateDateColumn,
} from 'typeorm';
import { War } from 'src/game/war/war.entity';
import { Catalog, ExpandedCatalog } from 'src/game/catalog/catalog.entity';
import { Guild } from 'src/core/guild/guild.entity';
import { StockpileLog } from './stockpile-log.entity';
import { Stockpile } from './stockpile.entity';

export type StockpileReportRecord = {
  ['Stockpile Title']: string;
  ['Stockpile Name']: string;
  ['Structure Type']: string;
  ['Quantity']: string;
  ['Name']: string;
  ['Crated?']: string;
  ['Per Crate']: string;
  ['Total']: string;
  ['Description']: string;
  ['CodeName']: string;
};

@Entity('stockpile_entry')
export class StockpileEntry {
  @PrimaryColumn({
    type: 'uuid',
    default: () => 'uuidv7()',
    primaryKeyConstraintName: 'pk_stockpile_entry_id',
  })
  id: string;

  @Column({ name: 'log_id', type: 'uuid' })
  @RelationId((entry: StockpileEntry) => entry.log)
  @Index('log_id_idx_stockpile_entry')
  logId: string;

  @ManyToOne(() => StockpileLog, { onDelete: 'RESTRICT' })
  @JoinColumn({
    name: 'log_id',
    referencedColumnName: 'id',
    foreignKeyConstraintName: 'fk_stockpile_entry_stockpile_log_id',
  })
  log: StockpileLog;

  @Column({ name: 'stockpile_id', type: 'uuid' })
  @RelationId((entry: StockpileEntry) => entry.stockpile)
  @Index('stockpile_id_idx_stockpile_entry')
  stockpileId: string;

  @ManyToOne(() => Stockpile, { onDelete: 'RESTRICT' })
  @JoinColumn({
    name: 'stockpile_id',
    referencedColumnName: 'id',
    foreignKeyConstraintName: 'fk_stockpile_entry_stockpile_id',
  })
  stockpile: Stockpile;

  @Column({ name: 'catalog_id', type: 'uuid' })
  @RelationId((entry: StockpileEntry) => entry.catalog)
  @Index('catalog_id_idx_stockpile_entry')
  catalogId: string;

  @ManyToOne(() => Catalog, { onDelete: 'RESTRICT' })
  @JoinColumn({
    name: 'catalog_id',
    referencedColumnName: 'id',
    foreignKeyConstraintName: 'fk_stockpile_entry_catalog_id',
  })
  catalog: Catalog;

  @ManyToOne(() => ExpandedCatalog, { createForeignKeyConstraints: false })
  @Expose({ name: 'catalog' })
  @Type(() => ExpandedCatalog)
  @Transform(({ value }) => (value ? value : null))
  @JoinColumn({
    name: 'catalog_id',
    referencedColumnName: 'id',
  })
  expandedCatalog: ExpandedCatalog;

  @Column({ name: 'war_number', type: 'int8' })
  @RelationId((entry: StockpileEntry) => entry.war)
  @Index('war_number_idx_stockpile_entry')
  warNumber: string;

  @ManyToOne(() => War, { onDelete: 'RESTRICT' })
  @JoinColumn({
    name: 'war_number',
    referencedColumnName: 'warNumber',
    foreignKeyConstraintName: 'fk_stockpile_entry_war_number',
  })
  war: War;

  @Column({ type: 'uuid', name: 'guild_id' })
  @RelationId((entry: StockpileEntry) => entry.guild)
  @Index('guild_id_idx_stockpile_entry')
  guildId: string;

  @ManyToOne(() => Guild, { onDelete: 'CASCADE', eager: true })
  @JoinColumn({
    name: 'guild_id',
    referencedColumnName: 'id',
    foreignKeyConstraintName: 'fk_stockpile_entry_guild_id',
  })
  guild: Guild;

  @Column({ type: 'int4', name: 'quantity_uncrated', default: 0 })
  @Expose()
  quantity: number;

  @Column({ type: 'int4', name: 'quantity_crated', default: 0 })
  @Expose()
  quantityCrated: number;

  @Column({ type: 'int4', name: 'quantity_shippable', default: 0 })
  @Expose()
  quantityShippable: number;

  @Column({ type: 'int8', name: 'created_by_sf' })
  @Expose()
  createdBy: Snowflake;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  @Expose()
  createdAt: Date;

  getValue(): string {
    const counts = [];

    if (this.quantityShippable) {
      counts.push(`${this.quantityShippable}sc`);
    }

    if (this.quantityCrated) {
      counts.push(`${this.quantityCrated}c`);
    }

    if (this.quantity) {
      counts.push(this.quantity);
    }

    return counts.length ? counts.join(' + ') : 'None';
  }
}

@ViewEntity({
  name: 'stockpile_entry_current',
  expression: (ds) =>
    ds
      .createQueryBuilder()
      .distinctOn(['entry.stockpile_id', 'entry.catalog_id'])
      .select('entry.*')
      .from(StockpileEntry, 'entry')
      .withDeleted()
      .leftJoinAndSelect('entry.log', 'l')
      .leftJoinAndSelect('entry.expandedCatalog', 'c')
      .innerJoin(
        () =>
          ds
            .createQueryBuilder()
            .subQuery()
            .addSelect('war_number')
            .from(War, 'war')
            .addOrderBy('war.war_number', 'DESC')
            .limit(1),
        'w',
        'w.war_number=entry.war_number',
      )
      .andWhere('l.deleted_at IS NULL')
      .orderBy('entry.stockpile_id')
      .addOrderBy('entry.catalog_id')
      .addOrderBy('entry.created_at', 'DESC'),
})
export class CurrentStockpileEntry {
  @Column({ type: 'uuid' })
  id: string;

  @Column({ type: 'uuid', name: 'log_id' })
  @RelationId((entry: CurrentStockpileEntry) => entry.log)
  logId: string;

  @ManyToOne(() => StockpileLog)
  @JoinColumn({
    name: 'log_id',
    referencedColumnName: 'id',
  })
  log: StockpileLog;

  @Column({ type: 'uuid', name: 'stockpile_id' })
  @RelationId((entry: CurrentStockpileEntry) => entry.stockpile)
  stockpileId: string;

  @ManyToOne(() => Stockpile)
  @JoinColumn({
    name: 'stockpile_id',
    referencedColumnName: 'id',
  })
  stockpile: Stockpile;

  @Column({ type: 'uuid', name: 'catalog_id' })
  catalogId: string;

  @ManyToOne(() => ExpandedCatalog)
  catalog: ExpandedCatalog;

  @ManyToOne(() => ExpandedCatalog)
  @Expose({ name: 'catalog' })
  @Type(() => ExpandedCatalog)
  @Transform(({ value }) => (value ? value : null))
  @JoinColumn({
    name: 'catalog_id',
    referencedColumnName: 'id',
  })
  expandedCatalog: ExpandedCatalog;

  @Column({ type: 'int8', name: 'war_number' })
  warNumber: string;

  @ManyToOne(() => War)
  @JoinColumn({
    name: 'war_number',
    referencedColumnName: 'warNumber',
  })
  war: War;

  @Column({ type: 'uuid', name: 'guild_id' })
  guildId: string;

  @ManyToOne(() => Guild)
  @JoinColumn({
    name: 'guild_id',
    referencedColumnName: 'id',
  })
  guild: Guild;

  @Column({ type: 'int4', name: 'quantity_uncrated' })
  quantity: number;

  @Column({ type: 'int4', name: 'quantity_crated' })
  quantityCrated: number;

  @Column({ type: 'int4', name: 'quantity_shippable' })
  quantityShippable: number;

  @Expose()
  @Column({ type: 'int8', name: 'created_by_sf' })
  createdBy: Snowflake;

  @Expose()
  @Column({ type: 'timestamptz', name: 'created_at' })
  createdAt: Date;

  getValue(): string {
    const counts = [];

    if (this.quantityShippable) {
      counts.push(`${this.quantityShippable}sc`);
    }

    if (this.quantityCrated) {
      counts.push(`${this.quantityCrated}c`);
    }

    if (this.quantity) {
      counts.push(this.quantity);
    }

    return counts.length ? counts.join(' + ') : 'None';
  }
}

export class InsertStockpileEntryDto extends PartialType(
  OmitType(StockpileEntry, [
    'id',
    'log',
    'stockpile',
    'catalog',
    'war',
    'guild',
    'createdAt',
  ] as const),
) {}
export class SelectStockpileEntryDto extends PartialType(
  PickType(StockpileEntry, ['id'] as const),
) {}
