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
} from 'typeorm';
import { Snowflake } from 'discord.js';
import { Crew } from 'src/bot/crew/crew.entity';

@Entity({ name: 'ticket' })
export class Ticket {
  @PrimaryColumn({ type: 'bigint', name: 'thread_sf' })
  thread: Snowflake;

  @Column({ type: 'bigint', name: 'guild_sf' })
  @Index()
  guild: Snowflake;

  @Column({ type: 'bigint', name: 'crew_channel_sf' })
  @Index()
  @RelationId((ticket: Ticket) => ticket.crew)
  discussion: Snowflake;

  @ManyToOne(() => Crew, (crew) => crew.tickets)
  @JoinColumn({
    name: 'crew_channel_sf',
    referencedColumnName: 'channel',
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
