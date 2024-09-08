import {
  Entity,
  Column,
  Index,
  CreateDateColumn,
  RelationId,
  ManyToOne,
  JoinColumn,
  PrimaryColumn,
  DeleteDateColumn,
  DeepPartial,
} from 'typeorm';
import { Snowflake } from 'discord.js';
import { Crew } from 'src/core/crew/crew.entity';

export type InsertCrewLog = DeepPartial<Omit<CrewLog, 'crew' | 'createdAt' | 'deletedAt'>>;
export type SelectCrewLog = DeepPartial<Pick<CrewLog, 'message'>>;

@Entity({ name: 'crew_log' })
export class CrewLog {
  @PrimaryColumn({ type: 'bigint', name: 'thread_sf', primaryKeyConstraintName: 'pk_thread_sf' })
  message: Snowflake;

  @Column({ type: 'bigint', name: 'guild_sf' })
  @Index('guild_sf_idx_crew_log')
  guild: Snowflake;

  @Column({ type: 'bigint', name: 'crew_channel_sf' })
  @Index('crew_channel_sf_idx_crew_log')
  @RelationId((ticket: CrewLog) => ticket.crew)
  discussion: Snowflake;

  @Column({ name: 'content', type: 'text' })
  content: string;

  @ManyToOne(() => Crew, (crew) => crew.tickets, { onDelete: 'CASCADE', eager: true })
  @JoinColumn({
    name: 'crew_channel_sf',
    referencedColumnName: 'channel',
    foreignKeyConstraintName: 'fk_crew_channel_sf_crew_log',
  })
  crew: Crew;

  @Column({ type: 'bigint', name: 'created_by_sf' })
  createdBy: Snowflake;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt: Date;

  @DeleteDateColumn({ type: 'timestamptz', name: 'deleted_at' })
  deletedAt: Date;

  get isDeleted() {
    return Boolean(this.deletedAt);
  }
}
