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
  PrimaryColumn,
} from 'typeorm';
import { Snowflake } from 'discord.js';
import { Crew } from 'src/core/crew/crew.entity';
import { ForumTag } from './tag.entity';

@Entity({ name: 'tag_template' })
@Unique('unique_tag_name', ['guild', 'name'])
export class ForumTagTemplate {
  @PrimaryColumn({ default: () => 'uuidv7()', primaryKeyConstraintName: 'pk_tag_template_id' })
  id: string;

  @Column()
  name: string;

  @Column({ default: false })
  moderated: boolean;

  @Column({ default: false })
  default: boolean;

  @Column({ type: 'bigint', name: 'guild_sf' })
  @Index('guild_sf_idx_tag_template')
  guild: Snowflake;

  @Column({ type: 'bigint', name: 'crew_channel_sf', nullable: true })
  @RelationId((tag: ForumTagTemplate) => tag.crew)
  @Index('crew_channel_sf_idx_tag_template')
  channel: Snowflake;

  @ManyToOne(() => Crew, (crew) => crew.tags, { onDelete: 'CASCADE', nullable: true, eager: true })
  @JoinColumn({
    name: 'crew_channel_sf',
    referencedColumnName: 'channel',
    foreignKeyConstraintName: 'fk_tag_template_crew',
  })
  crew: Crew;

  @OneToMany(() => ForumTag, (tag) => tag.template)
  tags: Promise<ForumTag[]>;

  @Column({ type: 'bigint', name: 'created_by_sf' })
  createdBy: Snowflake;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt: Date;
}
