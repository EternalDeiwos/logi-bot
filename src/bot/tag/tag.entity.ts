import {
  Entity,
  Column,
  Index,
  CreateDateColumn,
  PrimaryColumn,
  ManyToOne,
  JoinColumn,
  RelationId,
} from 'typeorm';
import { Snowflake } from 'discord.js';
import { Team } from '../team/team.entity';
import { ForumTagTemplate } from './tag-template.entity';

@Entity({ name: 'tag' })
export class ForumTag {
  @PrimaryColumn({ type: 'bigint', name: 'tag_sf' })
  tag: Snowflake;

  @Column()
  name: string;

  @Column({ type: 'bigint', name: 'guild_sf' })
  @Index()
  guild: Snowflake;

  @Column({ default: false })
  default: boolean;

  @Column({ type: 'bigint', name: 'forum_channel_sf' })
  @RelationId((tag: ForumTag) => tag.team)
  @Index()
  forum: Snowflake;

  @ManyToOne(() => Team, (team) => team.tags, { onDelete: 'CASCADE' })
  @JoinColumn({
    name: 'forum_channel_sf',
    referencedColumnName: 'forum',
  })
  team: Promise<Team>;

  @Column({ type: 'uuid', name: 'template_id' })
  @RelationId((tag: ForumTag) => tag.template)
  @Index()
  templateId: string;

  @ManyToOne(() => ForumTagTemplate, (template) => template.tags, { onDelete: 'CASCADE' })
  @JoinColumn({
    name: 'template_id',
    referencedColumnName: 'id',
  })
  template: Promise<ForumTagTemplate>;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt: Date;
}
