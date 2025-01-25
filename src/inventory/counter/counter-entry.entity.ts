import { Expose } from 'class-transformer';
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
} from 'typeorm';

import { Counter } from './counter.entity';

@Entity('counter_entry')
export class CounterEntry {
  @PrimaryColumn({
    type: 'uuid',
    default: () => 'uuidv7()',
    primaryKeyConstraintName: 'pk_counter_entry_id',
  })
  id: string;

  @Column({ name: 'counter_id', type: 'uuid' })
  @RelationId((entry: CounterEntry) => entry.counter)
  @Index('counter_id_idx_counter_entry')
  counterId: string;

  @ManyToOne(() => Counter, { onDelete: 'RESTRICT' })
  @JoinColumn({
    name: 'counter_id',
    referencedColumnName: 'id',
    foreignKeyConstraintName: 'fk_counter_entry_counter_id',
  })
  counter: Counter;

  @Column({ type: 'int4', default: 0 })
  @Expose()
  value: number;

  @Column({ type: 'int8', name: 'created_by_sf' })
  @Expose()
  createdBy: Snowflake;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  @Expose()
  createdAt: Date;
}
