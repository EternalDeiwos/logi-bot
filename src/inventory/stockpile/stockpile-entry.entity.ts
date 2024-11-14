import { Expose, Transform } from 'class-transformer';
import { Snowflake } from 'discord.js';
import {
  Entity,
  Column,
  Index,
  RelationId,
  ManyToOne,
  JoinColumn,
  ViewEntity,
  ViewColumn,
  PrimaryColumn,
  CreateDateColumn,
  DeepPartial,
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

export type SelectStockpileEntry = DeepPartial<Pick<StockpileEntry, 'id'>>;
export type InsertStockpileEntry = DeepPartial<
  Omit<StockpileEntry, 'id' | 'log' | 'stockpile' | 'catalog' | 'war' | 'guild' | 'createdAt'>
>;

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

  @Column({ name: 'stockpile_id', type: 'int8' })
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
  catalog: ExpandedCatalog;

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
  @Expose()
  @Transform(({ value }) => (value ? value : null))
  @JoinColumn({
    name: 'guild_id',
    referencedColumnName: 'id',
    foreignKeyConstraintName: 'fk_stockpile_entry_guild_id',
  })
  guild: Guild;

  @Column({ type: 'int4', name: 'quantity_uncrated', default: 0 })
  quantity: number;

  @Column({ type: 'int4', name: 'quantity_crated', default: 0 })
  quantityCrated: number;

  @Column({ type: 'int4', name: 'quantity_shippable', default: 0 })
  quantityShippable: number;

  @Expose()
  @Column({ type: 'int8', name: 'created_by_sf' })
  createdBy: Snowflake;

  @Expose()
  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt: Date;
}

@ViewEntity({
  name: 'stockpile_entry_current',
  expression: (ds) =>
    ds
      .createQueryBuilder(StockpileEntry, 'entry')
      .distinctOn(['entry.stockpile_id', 'entry.catalog_id'])
      .withDeleted()
      .leftJoinAndSelect('entry.log', 'log')
      .leftJoinAndSelect('entry.catalog', 'catalog')
      .andWhere('log.deleted_at IS NULL')
      .orderBy('entry.stockpile_id')
      .addOrderBy('entry.catalog_id')
      .addOrderBy('entry.created_at', 'DESC'),
})
export class CurrentStockpileEntry {
  @ViewColumn()
  id: string;

  @ViewColumn({ name: 'log_id' })
  logId: string;

  @ManyToOne(() => StockpileLog)
  log: StockpileLog;

  @ViewColumn({ name: 'stockpile_id' })
  stockpileId: string;

  @ManyToOne(() => Stockpile)
  stockpile: Stockpile;

  @ViewColumn({ name: 'catalog_id' })
  catalogId: string;

  @ManyToOne(() => Catalog)
  catalog: Catalog;

  @ViewColumn({ name: 'war_number' })
  warNumber: string;

  @ManyToOne(() => War)
  war: War;

  @ViewColumn({ name: 'quantity_uncrated' })
  quantity: number;

  @ViewColumn({ name: 'quantity_crated' })
  quantityCrated: number;

  @ViewColumn({ name: 'quantity_shippable' })
  quantityShippable: number;

  @Expose()
  @ViewColumn({ name: 'created_by_sf' })
  createdBy: Snowflake;

  @Expose()
  @ViewColumn({ name: 'created_at' })
  createdAt: Date;
}
