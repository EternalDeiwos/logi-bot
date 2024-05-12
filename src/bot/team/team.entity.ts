import { Entity, Column, Index, OneToMany, CreateDateColumn, PrimaryColumn } from 'typeorm';
import { Snowflake } from 'discord.js';
import { ForumTag } from 'src/bot/tag/tag.entity';
import { TicketTag } from 'src/bot/tag/tag.service';
import { Crew } from 'src/bot/crew/crew.entity';

@Entity({ name: 'team' })
export class Team {
  @PrimaryColumn({ type: 'bigint', name: 'category_channel_sf' })
  @Index()
  category: Snowflake;

  @Column()
  @Index({ fulltext: true })
  name: string;

  @Column({ type: 'bigint', name: 'guild_sf' })
  @Index()
  guild: Snowflake;

  @Column({ type: 'bigint', name: 'role_sf' })
  @Index()
  role: Snowflake;

  @Column({ type: 'bigint', name: 'forum_channel_sf' })
  @Index({ unique: true })
  forum: Snowflake;

  @Column({ type: 'bigint', name: 'audit_channel_sf', nullable: true })
  @Index()
  audit: Snowflake;

  @OneToMany(() => ForumTag, (tag) => tag.team, { eager: true })
  tags: Promise<ForumTag[]>;

  @OneToMany(() => Crew, (crew) => crew.team)
  crews: Promise<Crew[]>;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt: Date;

  async findTag(tag: TicketTag): Promise<Snowflake> {
    const tags = await this.tags;
    return tags.find((t) => t.name === tag)?.tag;
  }
}
