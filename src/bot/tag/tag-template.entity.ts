import {
  Entity,
  Column,
  Index,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  RelationId,
  PrimaryGeneratedColumn,
  OneToMany,
} from 'typeorm';
import { Snowflake } from 'discord.js';
import { Crew } from 'src/bot/crew/crew.entity';
import { ForumTag } from './tag.entity';

@Entity({ name: 'tag_template' })
export class ForumTagTemplate {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({ type: 'bigint', name: 'guild_sf' })
  @Index()
  guild: Snowflake;

  @Column({ type: 'bigint', name: 'crew_channel_sf' })
  @RelationId((tag: ForumTagTemplate) => tag.crew)
  @Index()
  channel: Snowflake;

  @ManyToOne(() => Crew, (crew) => crew.tags, { onDelete: 'CASCADE' })
  @JoinColumn({
    name: 'crew_channel_sf',
    referencedColumnName: 'channel',
  })
  crew: Crew;

  @OneToMany(() => ForumTag, (tag) => tag.template)
  tags: Promise<ForumTag[]>;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt: Date;
}
