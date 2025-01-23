import { Snowflake } from 'discord.js';
import { Expose, Transform } from 'class-transformer';
import {
  Entity,
  Column,
  Index,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  RelationId,
  OneToMany,
  Unique,
  DeepPartial,
  PrimaryColumn,
} from 'typeorm';
import { Guild } from 'src/core/guild/guild.entity';
import { Crew } from 'src/core/crew/crew.entity';
import { ForumTag } from './tag.entity';

export type InsertTagTemplate = DeepPartial<
  Omit<ForumTagTemplate, 'guild' | 'crew' | 'tags' | 'createdAt'>
>;
export type SelectTagTemplate = DeepPartial<Pick<ForumTagTemplate, 'id'>>;

@Entity('tag_template')
@Unique('uk_guild_id_name', ['guildId', 'name'])
export class ForumTagTemplate {
  @PrimaryColumn({
    type: 'uuid',
    default: () => 'uuidv7()',
    primaryKeyConstraintName: 'pk_tag_template_id',
  })
  id: string;

  @Column()
  @Expose()
  name: string;

  @Column({ default: false, comment: 'Is adding or removing this tag on posts restricted?' })
  @Expose()
  moderated: boolean;

  @Column({ default: false, comment: 'Is the tag applied automatically?' })
  @Expose()
  default: boolean;

  @Column({ nullable: true })
  @Expose()
  emoji: string;

  @Column({ type: 'uuid', name: 'guild_id' })
  @Index('guild_id_idx_tag_template')
  guildId: string;

  @ManyToOne(() => Guild, { onDelete: 'CASCADE', eager: true })
  @JoinColumn({
    name: 'guild_id',
    referencedColumnName: 'id',
    foreignKeyConstraintName: 'fk_tag_template_guild_id',
  })
  @Expose()
  @Transform(({ value }) => (value ? value : null))
  guild: Guild;

  @Column({
    type: 'uuid',
    name: 'crew_id',
    nullable: true,
    comment: 'Crew for which the tag was created, to identify tickets for a specific crew.',
  })
  @RelationId((tag: ForumTagTemplate) => tag.crew)
  @Index('crew_id_idx_tag_template')
  crewId: string;

  @ManyToOne(() => Crew, (crew) => crew.tags, { onDelete: 'CASCADE', nullable: true, eager: true })
  @JoinColumn({
    name: 'crew_id',
    referencedColumnName: 'id',
    foreignKeyConstraintName: 'fk_tag_template_crew_id',
  })
  @Expose()
  @Transform(({ value }) => (value ? value : null))
  crew: Crew;

  @OneToMany(() => ForumTag, (tag) => tag.template)
  @Expose()
  @Transform(({ value }) => (value ? value : null))
  tags: ForumTag[];

  @Column({ type: 'int8', name: 'created_by_sf' })
  @Expose()
  createdBy: Snowflake;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  @Expose()
  createdAt: Date;
}
