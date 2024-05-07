import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  Index,
  OneToMany,
  CreateDateColumn,
} from 'typeorm';
import { Snowflake } from 'discord.js';
import { ForumTag } from 'src/bot/tag/tag.entity';
import { Crew } from 'src/bot/crew/crew.entity';

@Entity({ name: 'team' })
export class Team {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({ name: 'name_short' })
  shortName: string;

  @Column({ type: 'bigint', name: 'guild_sf' })
  @Index()
  guild: Snowflake;

  @Column({ type: 'bigint', name: 'role_sf' })
  @Index()
  role: Snowflake;

  @Column({ type: 'bigint', name: 'category_channel_sf' })
  @Index()
  category: Snowflake;

  @Column({ type: 'bigint', name: 'forum_channel_sf' })
  @Index({ unique: true })
  forum: Snowflake;

  @OneToMany(() => ForumTag, (tag) => tag.team)
  tags: Promise<ForumTag[]>;

  @OneToMany(() => Crew, (crew) => crew.team)
  crews: Promise<Crew[]>;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt: Date;
}
