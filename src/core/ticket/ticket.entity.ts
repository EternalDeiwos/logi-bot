import {
  Entity,
  Column,
  DeleteDateColumn,
  Index,
  CreateDateColumn,
  RelationId,
  ManyToOne,
  JoinColumn,
  PrimaryColumn,
  UpdateDateColumn,
  DeepPartial,
} from 'typeorm';
import { Snowflake } from 'discord.js';
import { Crew } from 'src/core/crew/crew.entity';

export type InsertTicket = DeepPartial<
  Omit<Ticket, 'crew' | 'updatedAt' | 'createdAt' | 'deletedAt'>
>;
export type SelectTicket = DeepPartial<Pick<Ticket, 'thread'>>;

@Entity({ name: 'ticket' })
export class Ticket {
  @PrimaryColumn({ type: 'bigint', name: 'thread_sf', primaryKeyConstraintName: 'pk_thread_sf' })
  thread: Snowflake;

  @Column({ type: 'bigint', name: 'guild_sf' })
  @Index('guild_sf_idx_ticket')
  guild: Snowflake;

  @Column({ type: 'bigint', name: 'crew_channel_sf' })
  @Index('crew_channel_sf_idx_ticket')
  @RelationId((ticket: Ticket) => ticket.crew)
  discussion: Snowflake;

  @Column({ name: 'content', type: 'text' })
  content: string;

  @ManyToOne(() => Crew, (crew) => crew.tickets, { onDelete: 'CASCADE', eager: true })
  @JoinColumn({
    name: 'crew_channel_sf',
    referencedColumnName: 'channel',
    foreignKeyConstraintName: 'fk_ticket_crew',
  })
  crew: Crew;

  @Column()
  name: string;

  @UpdateDateColumn({ type: 'timestamptz', name: 'updated_at' })
  updatedAt: Date;

  @Column({ type: 'bigint', name: 'updated_by_sf' })
  updatedBy: Snowflake;

  @Column({ type: 'bigint', name: 'created_by_sf' })
  createdBy: Snowflake;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt: Date;

  @DeleteDateColumn({ type: 'timestamptz', name: 'deleted_at' })
  deletedAt: Date;
}
