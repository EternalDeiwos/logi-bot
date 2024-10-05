import {
  Entity,
  Column,
  Index,
  CreateDateColumn,
  PrimaryColumn,
  ManyToOne,
  JoinColumn,
  RelationId,
  Unique,
  DeepPartial,
} from 'typeorm';
import { Expose, Transform } from 'class-transformer';
import { Snowflake } from 'discord.js';
import { Team } from 'src/core/team/team.entity';
import { Guild } from 'src/core/guild/guild.entity';
import { ForumTagTemplate } from './tag-template.entity';

export type InsertTag = DeepPartial<Omit<ForumTag, 'guild' | 'team' | 'template' | 'createdAt'>>;
export type SelectTag = DeepPartial<Pick<ForumTag, 'tagSf'>>;

@Entity('tag')
@Unique('uk_template_id_team_id', ['templateId', 'teamId'])
export class ForumTag {
  @PrimaryColumn({ type: 'int8', name: 'tag_sf', primaryKeyConstraintName: 'pk_tag_sf' })
  @Expose()
  tagSf: Snowflake;

  @Column()
  @Expose()
  name: string;

  @Column({ type: 'uuid', name: 'guild_id' })
  @Index('guild_id_idx_tag')
  guildId: string;

  @ManyToOne(() => Guild, { onDelete: 'CASCADE', eager: true })
  @JoinColumn({
    name: 'guild_id',
    referencedColumnName: 'id',
    foreignKeyConstraintName: 'fk_tag_guild_id',
  })
  @Expose()
  @Transform(({ value }) => (value ? value : null))
  guild: Guild;

  @Column({ type: 'uuid', name: 'team_id' })
  @RelationId((tag: ForumTag) => tag.team)
  @Index('team_id_idx_tag')
  teamId: Snowflake;

  @ManyToOne(() => Team, (team) => team.tags, { onDelete: 'CASCADE' })
  @JoinColumn({
    name: 'team_id',
    referencedColumnName: 'id',
    foreignKeyConstraintName: 'fk_tag_team_id',
  })
  @Expose()
  @Transform(({ value }) => (value ? value : null))
  team: Team;

  @Column({ type: 'uuid', name: 'tag_template_id' })
  @RelationId((tag: ForumTag) => tag.template)
  @Index('tag_template_id_idx_tag')
  templateId: string;

  @ManyToOne(() => ForumTagTemplate, (template) => template.tags, { onDelete: 'CASCADE' })
  @JoinColumn({
    name: 'tag_template_id',
    referencedColumnName: 'id',
    foreignKeyConstraintName: 'fk_tag_tag_template_id',
  })
  @Expose()
  @Transform(({ value }) => (value ? value : null))
  template: ForumTagTemplate;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt: Date;
}
