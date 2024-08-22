import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
  RelationId,
} from 'typeorm';
import { Guild } from 'src/discord/guild/guild.entity';
import { War } from 'src/game/war/war.entity';
import { Catalog } from 'src/game/catalog/catalog.entity';
import { StockpileLog } from './stockpile-log.entity';

@Entity()
export class StockpileEntry {
  @PrimaryGeneratedColumn({ type: 'int8', primaryKeyConstraintName: 'pk_stockpile_entry_id' })
  id: number;

  @Column({ name: 'guild_id', type: 'int8' })
  @RelationId((entry: StockpileEntry) => entry.guild)
  @Index('guild_id_idx_stockpile_entry')
  guildId: string;

  @ManyToOne(() => Guild, { lazy: true })
  @JoinColumn({
    name: 'guild_id',
    referencedColumnName: 'id',
    foreignKeyConstraintName: 'fk_stockpile_entry_guild_id',
  })
  guild: Promise<Guild>;

  @Column({ name: 'war_number', type: 'int8' })
  @RelationId((entry: StockpileEntry) => entry.war)
  @Index('war_number_idx_stockpile_entry')
  warNumber: string;

  @ManyToOne(() => War, { lazy: true })
  @JoinColumn({
    name: 'war_number',
    referencedColumnName: 'warNumber',
    foreignKeyConstraintName: 'fk_stockpile_entry_war_number',
  })
  war: Promise<War>;

  @Column({ name: 'log_id', type: 'int8' })
  @RelationId((entry: StockpileEntry) => entry.log)
  @Index('log_id_idx_stockpile_entry')
  logId: string;

  @ManyToOne(() => StockpileLog, { eager: true })
  @JoinColumn({
    name: 'log_id',
    referencedColumnName: 'id',
    foreignKeyConstraintName: 'fk_stockpile_entry_stockpile_log_id',
  })
  log: StockpileLog;

  @Column({ name: 'catalog_id', type: 'int8' })
  @RelationId((entry: StockpileEntry) => entry.catalog)
  @Index('catalog_id_idx_stockpile_entry')
  catalogId: string;

  @ManyToOne(() => Catalog, { eager: true })
  @JoinColumn({
    name: 'catalog_id',
    referencedColumnName: 'id',
    foreignKeyConstraintName: 'fk_stockpile_entry_catalog_id',
  })
  catalog: Catalog;

  @Column({
    name: 'quantity_loose',
    type: 'int4',
    default: 0,
    comment: 'The loose number of items submitted to facility buildings or bunker bases',
  })
  loose: number;

  @Column({
    name: 'quantity_crates',
    type: 'int4',
    default: 0,
    comment:
      'The number of crated supply items in a stockpile submitted to storage depots, seaports, or large ships',
  })
  crates: number;

  @Column({
    name: 'quantity_shippable',
    type: 'int4',
    default: 0,
    comment:
      'The number of shippable crates in a stockpile submitted to facility buildings or bunker bases',
  })
  shippable: number;

  @Column({ name: 'created_by_sf', type: 'int8' })
  createdBy: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
