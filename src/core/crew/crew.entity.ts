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
import { CrewMemberAccess } from 'src/types';
import { ForumTagTemplate } from 'src/core/tag/tag-template.entity';
import { Ticket } from 'src/core/ticket/ticket.entity';
import { Team } from 'src/core/team/team.entity';
import { Guild } from 'src/core/guild/guild.entity';
import { CrewMember } from './member/crew-member.entity';
import { CrewLog } from './log/crew-log.entity';
import { CrewShare } from './share/crew-share.entity';

export type InsertCrew = DeepPartial<
  Omit<
    Crew,
    | 'guild'
    | 'team'
    | 'members'
    | 'tags'
    | 'tickets'
    | 'logs'
    | 'shared'
    | 'createdAt'
    | 'deletedAt'
    | 'isDeleted'
    | 'getCrewTag'
    | 'getCrewOwner'
  >
>;
export type SelectCrew = DeepPartial<Pick<Crew, 'crewSf'>>;
export type UpdateCrew = DeepPartial<Pick<Crew, 'hasMovePrompt' | 'isPermanent' | 'isSecureOnly'>>;
export type DeleteCrew = SelectCrew & { deletedBySf?: Snowflake };
export type ArchiveCrew = DeleteCrew & { archiveSf?: Snowflake; tag?: string };

@Entity()
@Unique('uk_guild_name_deleted_at', ['guildId', 'shortName', 'deletedAt'])
@Unique('uk_guild_crew_deleted_at', ['guildId', 'crewSf', 'deletedAt'])
export class Crew {
  /**
   * Snowflake for crew Discord channel
   * @type Snowflake
   */
  @PrimaryColumn({
    type: 'int8',
    name: 'crew_channel_sf',
    primaryKeyConstraintName: 'pk_crew_channel_sf',
  })
  crewSf: Snowflake;

  @Column({ type: 'int8', name: 'voice_channel_sf', nullable: true })
  voiceSf?: Snowflake;

  @Column({ type: 'int8', name: 'guild_id' })
  @RelationId((crew: Crew) => crew.guild)
  @Index('guild_id_idx_crew')
  guildId: string;

  @ManyToOne(() => Guild, { onDelete: 'CASCADE', eager: true })
  @JoinColumn({
    name: 'guild_id',
    referencedColumnName: 'id',
    foreignKeyConstraintName: 'fk_crew_guild_id',
  })
  guild: Guild;

  @Column({ type: 'int8', name: 'team_id' })
  @RelationId((crew: Crew) => crew.team)
  @Index('team_id_idx_crew')
  teamId: string;

  @ManyToOne(() => Team, (team) => team.crews, { onDelete: 'CASCADE', eager: true })
  @JoinColumn({
    name: 'team_id',
    referencedColumnName: 'id',
    foreignKeyConstraintName: 'fk_crew_team_id',
  })
  team: Team;

  @Column()
  name: string;

  @Column({ name: 'name_short' })
  shortName: string;

  @Column()
  slug: string;

  @Column({ type: 'int8', name: 'role_sf' })
  @Index('role_sf_idx_crew')
  roleSf: Snowflake;

  @Column({ type: 'int8', name: 'audit_message_sf', nullable: true })
  @Index('audit_message_sf_idx_crew')
  auditMessageSf: Snowflake;

  @Column({
    type: 'boolean',
    name: 'enable_move_prompt',
    default: false,
    comment: 'Tickets for this crew will display the move dialog by default',
  })
  hasMovePrompt: boolean;

  @Column({
    type: 'boolean',
    name: 'is_permanent',
    default: false,
    comment: 'Crew will not be archived during a purge',
  })
  isPermanent: boolean;

  @Column({
    type: 'boolean',
    name: 'secure_only',
    default: true,
    comment: 'Crew information to be displayed only in private channels',
  })
  isSecureOnly: boolean;

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

  @Column({ type: 'int8', name: 'created_by_sf' })
  createdBy: Snowflake;

  @Column({ type: 'int8', name: 'deleted_by_sf', nullable: true })
  deletedBy: Snowflake;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt: Date;

  @DeleteDateColumn({ type: 'timestamptz', name: 'deleted_at' })
  deletedAt: Date;

  async getCrewTag() {
    const tags = await this.team.tags;
    return tags.find((tag) => tag.name === this.shortName);
  }

  async getCrewOwner() {
    const members = await this.members;
    return members.find((member) => member.access === CrewMemberAccess.OWNER);
  }
}
