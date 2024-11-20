import { Expose, Transform, Type } from 'class-transformer';
import { Snowflake } from 'discord.js';
import {
  Entity,
  Column,
  Index,
  RelationId,
  ManyToOne,
  JoinColumn,
  PrimaryColumn,
  CreateDateColumn,
  DeepPartial,
  DeleteDateColumn,
} from 'typeorm';
import { AccessEntry } from 'src/core/access/access.entity';
import { Stockpile } from './stockpile.entity';

export type SelectStockpileAccess = DeepPartial<Pick<StockpileAccess, 'id'>>;
export type InsertStockpileAccess = DeepPartial<
  Omit<StockpileAccess, 'id' | 'stockpile' | 'rule' | 'guild' | 'updatedAt'>
>;

@Entity('stockpile_access')
export class StockpileAccess {
  @PrimaryColumn({
    type: 'uuid',
    default: () => 'uuidv7()',
    primaryKeyConstraintName: 'pk_stockpile_access_id',
  })
  @Expose()
  id: string;

  @Column({ name: 'rule_id', type: 'uuid' })
  @RelationId((entry: StockpileAccess) => entry.rule)
  @Index('rule_id_idx_stockpile_access')
  ruleId: string;

  @ManyToOne(() => AccessEntry, { onDelete: 'RESTRICT' })
  @Expose()
  @Type(() => AccessEntry)
  @Transform(({ value }) => (value ? value : null))
  @JoinColumn({
    name: 'rule_id',
    referencedColumnName: 'id',
    foreignKeyConstraintName: 'fk_stockpile_access_rule_id',
  })
  rule: AccessEntry;

  @Column({ name: 'stockpile_id', type: 'uuid' })
  @RelationId((entry: StockpileAccess) => entry.stockpile)
  @Index('stockpile_id_idx_stockpile_access')
  stockpileId: string;

  @ManyToOne(() => Stockpile, { onDelete: 'CASCADE' })
  @JoinColumn({
    name: 'stockpile_id',
    referencedColumnName: 'id',
    foreignKeyConstraintName: 'fk_stockpile_entry_stockpile_id',
  })
  stockpile: Stockpile;

  @Column({ type: 'int8', name: 'created_by_sf' })
  @Expose()
  createdBy: Snowflake;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  @Expose()
  createdAt: Date;

  @DeleteDateColumn({ type: 'timestamptz', name: 'deleted_at' })
  @Expose()
  deletedAt: Date;
}
