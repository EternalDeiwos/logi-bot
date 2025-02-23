import { PickType } from '@nestjs/swagger';
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
  DeleteDateColumn,
  Unique,
} from 'typeorm';
import { AccessEntry } from 'src/core/access/access.entity';
import { Counter } from './counter.entity';

@Entity('counter_access')
@Unique('uk_rule_counter_deleted_at', ['ruleId', 'counterId', 'deletedAt'])
export class CounterAccess {
  @PrimaryColumn({
    type: 'uuid',
    default: () => 'uuidv7()',
    primaryKeyConstraintName: 'pk_counter_access_id',
  })
  @Expose()
  id: string;

  @Column({ name: 'rule_id', type: 'uuid' })
  @RelationId((entry: CounterAccess) => entry.rule)
  @Index('rule_id_idx_counter_access')
  ruleId: string;

  @ManyToOne(() => AccessEntry, { onDelete: 'RESTRICT' })
  @Expose()
  @Type(() => AccessEntry)
  @Transform(({ value }) => (value ? value : null))
  @JoinColumn({
    name: 'rule_id',
    referencedColumnName: 'id',
    foreignKeyConstraintName: 'fk_counter_access_rule_id',
  })
  rule: AccessEntry;

  @Column({ name: 'counter_id', type: 'uuid' })
  @RelationId((entry: CounterAccess) => entry.counter)
  @Index('counter_id_idx_counter_access')
  counterId: string;

  @ManyToOne(() => Counter, { onDelete: 'CASCADE' })
  @JoinColumn({
    name: 'counter_id',
    referencedColumnName: 'id',
    foreignKeyConstraintName: 'fk_counter_access_counter_id',
  })
  counter: Counter;

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

export class SelectCounterAccessDto extends PickType(CounterAccess, ['id'] as const) {}
export class InsertCounterAccessDto extends PickType(CounterAccess, [
  'ruleId',
  'counterId',
  'createdBy',
] as const) {}
