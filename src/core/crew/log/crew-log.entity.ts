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
} from 'typeorm';
import { Snowflake } from 'discord.js';
import { Crew } from 'src/core/crew/crew.entity';

@Entity({ name: 'crew_log' })
export class CrewLog {
  @PrimaryColumn({ type: 'bigint', name: 'thread_sf' })
  message: Snowflake;

  @Column({ type: 'bigint', name: 'guild_sf' })
  @Index()
  guild: Snowflake;

  @Column({ type: 'bigint', name: 'crew_channel_sf' })
  @Index()
  @RelationId((ticket: CrewLog) => ticket.crew)
  discussion: Snowflake;

  @Column({ name: 'content', type: 'text' })
  @Index({ fulltext: true })
  content: string;

  @ManyToOne(() => Crew, (crew) => crew.tickets, { onDelete: 'CASCADE', eager: true })
  @JoinColumn({
    name: 'crew_channel_sf',
    referencedColumnName: 'channel',
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
