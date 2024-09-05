import { Entity, Column, Index, OneToMany, CreateDateColumn, PrimaryColumn } from 'typeorm';
import { Snowflake } from 'discord.js';
import { ForumTag } from 'src/core/tag/tag.entity';
import { TicketTag } from 'src/core/tag/tag.service';
import { Crew } from 'src/core/crew/crew.entity';

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

  async resolveSnowflakeFromTag(tag: TicketTag): Promise<Snowflake> {
    const tags = await this.tags;
    return tags.find((t) => t.name === tag)?.tag;
  }

  async resolveNameFromSnowflake(snowflake: Snowflake): Promise<string> {
    const tags = await this.tags;
    return tags.find((t) => t.tag === snowflake)?.name;
  }

  async getTagMap() {
    const tags = await this.tags;
    return tags.reduce(
      (accumulator, tag) => {
        accumulator[tag.tag] = tag.name;
        return accumulator;
      },
      {} as Record<Snowflake, string>,
    );
  }

  async getSnowflakeMap() {
    const tags = await this.tags;
    return tags.reduce(
      (accumulator, tag) => {
        accumulator[tag.name] = tag.tag;
        return accumulator;
      },
      {} as Record<string, Snowflake>,
    );
  }

  async getDefaultTags() {
    const tags = await this.tags;
    return (
      await Promise.all(
        tags.map(async (tag) => [tag.tag, (await tag.template).default] as [string, boolean]),
      )
    ).reduce((acc, [tag_sf, isDefault]) => {
      if (isDefault) {
        acc.push(tag_sf);
      }
      return acc;
    }, [] as string[]);
  }
}
