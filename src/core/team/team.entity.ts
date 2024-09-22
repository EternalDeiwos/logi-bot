import {
  Entity,
  Column,
  Index,
  OneToMany,
  CreateDateColumn,
  DeleteDateColumn,
  ManyToOne,
  JoinColumn,
  DeepPartial,
  Unique,
  PrimaryColumn,
  RelationId,
} from 'typeorm';
import { Snowflake } from 'discord.js';
import { Expose } from 'class-transformer';
import { TicketTag } from 'src/types';
import { ForumTag } from 'src/core/tag/tag.entity';
import { Guild } from 'src/core/guild/guild.entity';
import { Crew } from 'src/core/crew/crew.entity';

export type InsertTeam = DeepPartial<
  Omit<
    Team,
    | 'createdAt'
    | 'deletedAt'
    | 'guild'
    | 'tags'
    | 'crews'
    | 'resolveSnowflakeFromTag'
    | 'resolveNameFromSnowflake'
    | 'getTagMap'
    | 'getSnowflakeMap'
    | 'getDefaultTags'
  >
>;
export type SelectTeam = DeepPartial<Pick<Team, 'id'>>;

@Entity()
@Unique('uk_name_guild_id_team', ['name', 'guildId', 'deletedAt'])
export class Team {
  @PrimaryColumn({
    type: 'uuid',
    default: () => 'uuidv7()',
    primaryKeyConstraintName: 'pk_team_id',
  })
  id: string;

  @Expose()
  @Column()
  @Index('name_idx_team')
  name: string;

  @Column({ type: 'uuid', name: 'guild_id' })
  @RelationId((team: Team) => team.guild)
  @Index('guild_id_idx_team')
  guildId: string;

  @ManyToOne(() => Guild, { onDelete: 'CASCADE', eager: true })
  @JoinColumn({
    name: 'guild_id',
    referencedColumnName: 'id',
    foreignKeyConstraintName: 'fk_team_guild_id',
  })
  guild: Guild;

  @Expose()
  @Column({
    type: 'int8',
    name: 'forum_channel_sf',
    comment: 'Forum where crew tickets will be sent',
  })
  @Index('forum_channel_sf_idx_team')
  forumSf: Snowflake;

  @Expose()
  @Column({
    type: 'int8',
    name: 'category_channel_sf',
    comment: 'Category where crew channels will be created',
  })
  @Index('category_channel_sf_idx_team')
  categorySf: Snowflake;

  @OneToMany(() => ForumTag, (tag) => tag.team)
  tags: ForumTag[];

  @OneToMany(() => Crew, (crew) => crew.team)
  crews: Crew[];

  @Expose()
  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt: Date;

  @Expose()
  @DeleteDateColumn({ type: 'timestamptz', name: 'deleted_at' })
  deletedAt: Date;

  async resolveSnowflakeFromTag(tag: TicketTag): Promise<Snowflake> {
    const tags = await this.tags;
    return tags.find((t) => t.name === tag)?.tagSf;
  }

  async resolveNameFromSnowflake(snowflake: Snowflake): Promise<string> {
    const tags = await this.tags;
    return tags.find((t) => t.tagSf === snowflake)?.name;
  }

  async getTagMap() {
    const tags = await this.tags;
    return tags.reduce(
      (accumulator, tag) => {
        accumulator[tag.tagSf] = tag.name;
        return accumulator;
      },
      {} as Record<Snowflake, string>,
    );
  }

  async getSnowflakeMap() {
    const tags = await this.tags;
    return tags.reduce(
      (accumulator, tag) => {
        accumulator[tag.name] = tag.tagSf;
        return accumulator;
      },
      {} as Record<string, Snowflake>,
    );
  }

  async getDefaultTags() {
    const tags = await this.tags;
    return (
      await Promise.all(
        tags.map(async (tag) => [tag.tagSf, (await tag.template).default] as [string, boolean]),
      )
    ).reduce((acc, [tag_sf, isDefault]) => {
      if (isDefault) {
        acc.push(tag_sf);
      }
      return acc;
    }, [] as string[]);
  }
}
