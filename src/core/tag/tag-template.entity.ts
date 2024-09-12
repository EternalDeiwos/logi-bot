import { Snowflake } from 'discord.js';
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
  @PrimaryColumn({ default: () => 'uuidv7()', primaryKeyConstraintName: 'pk_tag_template_id' })
  id: string;

  @Column()
  name: string;

  @Column({ default: false, comment: 'Is adding or removing this tag on posts restricted?' })
  moderated: boolean;

  @Column({ default: false, comment: 'Is the tag applied automatically?' })
  default: boolean;

  @Column({ nullable: true })
  emoji: string;

  @Column({ type: 'int8', name: 'guild_id' })
  @Index('guild_id_idx_tag_template')
  guildId: string;

  @ManyToOne(() => Guild, { onDelete: 'CASCADE', eager: true })
  @JoinColumn({
    name: 'guild_id',
    referencedColumnName: 'id',
    foreignKeyConstraintName: 'fk_tag_template_guild_id',
  })
  guild: Guild;

  /**
   * Snowflake for crew Discord channel
   * @type Snowflake
   */
  @Column({
    type: 'int8',
    name: 'crew_channel_sf',
    nullable: true,
    comment: 'Crew for which the tag was created, to identify tickets for a specific crew.',
  })
  @RelationId((tag: ForumTagTemplate) => tag.crew)
  @Index('crew_channel_sf_idx_tag_template')
  crewSf: Snowflake;

  @ManyToOne(() => Crew, (crew) => crew.tags, { onDelete: 'CASCADE', nullable: true, eager: true })
  @JoinColumn({
    name: 'crew_channel_sf',
    referencedColumnName: 'crewSf',
    foreignKeyConstraintName: 'fk_tag_template_crew_channel_sf',
  })
  crew: Crew;

  @OneToMany(() => ForumTag, (tag) => tag.template)
  tags: Promise<ForumTag[]>;

  @Column({ type: 'int8', name: 'created_by_sf' })
  createdBy: Snowflake;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt: Date;
}
