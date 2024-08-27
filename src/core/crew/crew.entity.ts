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
} from 'typeorm';
import { Snowflake } from 'discord.js';
import { CrewMemberAccess } from 'src/types';
import { ForumTagTemplate } from 'src/core/tag/tag-template.entity';
import { Ticket } from 'src/core/ticket/ticket.entity';
import { Team } from 'src/core/team/team.entity';
import { Guild } from 'src/core/guild/guild.entity';
import { CrewMember } from './crew-member.entity';
import { CrewLog } from './crew-log.entity';
import { CrewShare } from './crew-share.entity';

@Entity()
@Unique('uk_guild_name_deleted_at', ['guild', 'shortName', 'deletedAt'])
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

  @Column({ type: 'boolean', name: 'enable_move_prompt', default: false })
  hasMovePrompt: boolean;

  @Column({ type: 'boolean', name: 'is_permanent', default: false })
  isPermanent: boolean;

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

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt: Date;

  @DeleteDateColumn({ type: 'timestamptz', name: 'deleted_at' })
  deletedAt: Date;

  get isDeleted() {
    return Boolean(this.deletedAt);
  }

  async getCrewTag() {
    const tags = await this.team.tags;
    return tags.find((tag) => tag.name === this.shortName);
  }

  async getCrewOwner() {
    const members = await this.members;
    return members.find((member) => member.access === CrewMemberAccess.OWNER);
  }
}
