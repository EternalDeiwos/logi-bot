import {
  Entity,
  Column,
  Index,
  CreateDateColumn,
  PrimaryColumn,
  OneToMany,
  RelationId,
  ManyToOne,
  JoinColumn,
  Unique,
  DeleteDateColumn,
  DeepPartial,
} from 'typeorm';
import { Snowflake } from 'discord.js';
import { ForumTagTemplate } from 'src/core/tag/tag-template.entity';
import { Ticket } from 'src/core/ticket/ticket.entity';
import { Team } from 'src/core/team/team.entity';
import { CrewMember } from './member/crew-member.entity';
import { CrewLog } from './log/crew-log.entity';
import { CrewShare } from './share/crew-share.entity';
import { Guild } from '../guild/guild.entity';

export type InsertCrew = DeepPartial<
  Omit<
    Crew,
    | 'parent'
    | 'team'
    | 'members'
    | 'tags'
    | 'tickets'
    | 'logs'
    | 'shared'
    | 'createdAt'
    | 'deletedAt'
  >
>;
export type SelectCrew = DeepPartial<Pick<Crew, 'channel'>>;
export type DeleteCrew = SelectCrew & { deletedBySf?: Snowflake };
export type ArchiveCrew = DeleteCrew & { archiveSf?: Snowflake; tag?: string };

@Entity({ name: 'crew' })
@Unique('unique_crew_tag_name', ['guild', 'shortName', 'deletedAt'])
export class Crew {
  @PrimaryColumn({
    type: 'bigint',
    name: 'crew_channel_sf',
    primaryKeyConstraintName: 'pk_crew_channel_sf',
  })
  channel: Snowflake;

  @Column({ type: 'bigint', name: 'guild_sf' })
  @RelationId((crew: Crew) => crew.parent)
  @Index('guild_sf_idx_crew')
  guild: Snowflake;

  @ManyToOne(() => Guild, { onDelete: 'CASCADE', eager: true })
  @JoinColumn({
    name: 'guild_sf',
    referencedColumnName: 'guild',
    foreignKeyConstraintName: 'fk_guild_sf_crew',
  })
  parent: Guild;

  @Column()
  name: string;

  @Column({ name: 'name_short' })
  shortName: string;

  @Column()
  slug: string;

  @Column({ type: 'bigint', name: 'role_sf' })
  @Index('role_sf_idx_crew')
  role: Snowflake;

  @Column({ type: 'boolean', name: 'enable_move_prompt', default: false })
  movePrompt: boolean;

  @Column({ type: 'boolean', name: 'permanent', default: false })
  permanent: boolean;

  @Column({ type: 'bigint', name: 'forum_channel_sf' })
  @RelationId((crew: Crew) => crew.team)
  @Index('forum_channel_sf_idx_crew')
  forum: Snowflake;

  @ManyToOne(() => Team, (team) => team.crews, { onDelete: 'CASCADE', eager: true })
  @JoinColumn({
    name: 'forum_channel_sf',
    referencedColumnName: 'forum',
    foreignKeyConstraintName: 'fk_forum_channel_sf_crew',
  })
  team: Team;

  @OneToMany(() => CrewMember, (member) => member.crew)
  members: Promise<CrewMember[]>;

  @OneToMany(() => ForumTagTemplate, (tag) => tag.crew)
  tags: Promise<ForumTagTemplate[]>;

  @OneToMany(() => Ticket, (ticket) => ticket.crew)
  tickets: Promise<Ticket[]>;

  @OneToMany(() => CrewLog, (log) => log.crew)
  logs: Promise<CrewLog[]>;

  @OneToMany(() => CrewShare, (share) => share.crew)
  shared: Promise<CrewShare[]>;

  @Column({ type: 'bigint', name: 'created_by_sf' })
  createdBy: Snowflake;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt: Date;

  @DeleteDateColumn({ type: 'timestamptz', name: 'deleted_at' })
  deletedAt: Date;
}
