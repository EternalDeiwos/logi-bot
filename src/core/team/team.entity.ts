import {
  Entity,
  Column,
  Index,
  OneToMany,
  CreateDateColumn,
  PrimaryColumn,
  ManyToOne,
  JoinColumn,
  Unique,
  DeepPartial,
} from 'typeorm';
import { Snowflake } from 'discord.js';
import { Guild } from 'src/core/guild/guild.entity';
import { ForumTag } from 'src/core/tag/tag.entity';
import { TicketTag } from 'src/core/tag/tag.service';
import { Crew } from 'src/core/crew/crew.entity';

export type InsertTeam = DeepPartial<
  Omit<
    Team,
    | 'parent'
    | 'tags'
    | 'crews'
    | 'createdAt'
    | 'resolveSnowflakeFromTag'
    | 'resolveNameFromSnowflake'
    | 'getTagMap'
    | 'getSnowflakeMap'
    | 'getDefaultTags'
  >
>;
export type SelectTeam = DeepPartial<Pick<Team, 'category'>>;

@Entity({ name: 'team' })
@Unique('uk_name_guild_sf_team', ['name', 'guild'])
export class Team {
  @PrimaryColumn({
    type: 'bigint',
    name: 'category_channel_sf',
    primaryKeyConstraintName: 'pk_team_category_channel_sf',
  })
  @Index('category_channel_sf_idx_team')
  category: Snowflake;

  @Column()
  @Index('name_idx_team')
  name: string;

  @Column({ type: 'bigint', name: 'guild_sf' })
  @Index('guild_sf_idx_team')
  guild: Snowflake;

  @Column({ type: 'bigint', name: 'forum_channel_sf' })
  @Index('forum_channel_sf_idx_team', { unique: true })
  forum: Snowflake;

  @ManyToOne(() => Guild, (guild) => guild.teams, { onDelete: 'CASCADE', eager: true })
  @JoinColumn({
    name: 'guild',
    referencedColumnName: 'guild',
    foreignKeyConstraintName: 'fk_team_guild_sf',
  })
  parent: Guild;

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
