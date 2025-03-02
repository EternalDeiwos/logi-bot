import { OmitType, IntersectionType, PickType, PartialType } from '@nestjs/swagger';
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
import { Expose, Transform, Type } from 'class-transformer';
import { CrewMemberAccess } from 'src/types';
import { Ticket } from 'src/core/ticket/ticket.entity';
import { Team } from 'src/core/team/team.entity';
import { Guild } from 'src/core/guild/guild.entity';
import { CrewMember } from './member/crew-member.entity';
import { CrewLog } from './log/crew-log.entity';
import { CrewShare } from './share/crew-share.entity';

@Entity()
@Unique('uk_guild_name_deleted_at', ['guildId', 'shortName', 'deletedAt'])
@Unique('uk_guild_crew_deleted_at', ['guildId', 'crewSf', 'deletedAt'])
export class Crew {
  @Expose()
  @PrimaryColumn({
    type: 'uuid',
    default: () => 'uuidv7()',
    primaryKeyConstraintName: 'pk_crew_id',
  })
  id: string;

  /**
   * Snowflake for crew Discord channel
   * @type Snowflake
   */
  @Expose()
  @Column({
    type: 'int8',
    name: 'crew_channel_sf',
    nullable: true,
  })
  @Index('crew_channel_sf_idx_crew')
  crewSf?: Snowflake;

  @Expose()
  @Column({ type: 'int8', name: 'voice_channel_sf', nullable: true })
  voiceSf?: Snowflake;

  @Column({ type: 'uuid', name: 'guild_id' })
  @RelationId((crew: Crew) => crew.guild)
  @Index('guild_id_idx_crew')
  guildId: string;

  @ManyToOne(() => Guild, { onDelete: 'CASCADE', eager: true })
  @Expose()
  @Transform(({ value }) => (value ? value : null))
  @JoinColumn({
    name: 'guild_id',
    referencedColumnName: 'id',
    foreignKeyConstraintName: 'fk_crew_guild_id',
  })
  guild: Guild;

  @Column({ type: 'uuid', name: 'team_id' })
  @RelationId((crew: Crew) => crew.team)
  @Index('team_id_idx_crew')
  teamId: string;

  @Expose()
  @ManyToOne(() => Team, (team) => team.crews, { onDelete: 'CASCADE', eager: true })
  @JoinColumn({
    name: 'team_id',
    referencedColumnName: 'id',
    foreignKeyConstraintName: 'fk_crew_team_id',
  })
  team: Team;

  @Expose()
  @Column()
  name: string;

  @Expose()
  @Column({ name: 'name_short' })
  shortName: string;

  @Expose()
  @Column()
  slug: string;

  @Expose()
  @Column({ type: 'int8', name: 'role_sf', nullable: true })
  @Index('role_sf_idx_crew')
  roleSf?: Snowflake;

  @Column({ type: 'int8', name: 'audit_message_sf', nullable: true })
  @Index('audit_message_sf_idx_crew')
  auditMessageSf?: Snowflake;

  @Expose()
  @Column({
    type: 'boolean',
    name: 'enable_move_prompt',
    default: false,
    comment: 'Tickets for this crew will display the move dialog by default',
  })
  hasMovePrompt: boolean;

  @Expose()
  @Column({
    type: 'boolean',
    name: 'is_permanent',
    default: false,
    comment: 'Crew will not be archived during a purge',
  })
  isPermanent: boolean;

  @Expose()
  @Column({
    type: 'boolean',
    name: 'is_pruning',
    default: false,
    comment: 'Crew will not be pruned',
  })
  isAutomaticPruning: boolean;

  @Column({
    type: 'boolean',
    name: 'require_voice_channel',
    default: false,
    comment: 'Crew will be created with a voice channel',
  })
  requireVoice: boolean;

  @Expose()
  @Column({
    type: 'boolean',
    name: 'secure_only',
    default: true,
    comment: 'Crew information to be displayed only in private channels',
  })
  isSecureOnly: boolean;

  @Expose()
  @Type(() => CrewMember)
  @Transform(({ value }) => (value ? value : null))
  @OneToMany(() => CrewMember, (member) => member.crew)
  members: CrewMember[];

  @Expose()
  @Type(() => Ticket)
  @Transform(({ value }) => (value ? value : null))
  @OneToMany(() => Ticket, (ticket) => ticket.crew)
  tickets: Ticket[];

  @Expose()
  @Type(() => CrewLog)
  @Transform(({ value }) => (value ? value : null))
  @OneToMany(() => CrewLog, (log) => log.crew)
  logs: CrewLog[];

  @OneToMany(() => CrewShare, (share) => share.crew)
  shared: CrewShare[];

  @Column({ type: 'timestamptz', name: 'processed_at', nullable: true })
  processedAt: Date;

  @Expose()
  @Column({ type: 'int8', name: 'created_by_sf' })
  createdBy: Snowflake;

  @Expose()
  @Column({ type: 'int8', name: 'approved_by_sf', nullable: true })
  approvedBy: Snowflake;

  @Expose()
  @Column({ type: 'int8', name: 'deleted_by_sf', nullable: true })
  deletedBy: Snowflake;

  @Expose()
  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt: Date;

  @Expose()
  @DeleteDateColumn({ type: 'timestamptz', name: 'deleted_at' })
  deletedAt: Date;

  async getCrewOwner() {
    const members = await this.members;
    return members.find((member) => member.access === CrewMemberAccess.OWNER);
  }
}

export class InsertCrewDto extends PartialType(
  OmitType(Crew, [
    'id',
    'guild',
    'team',
    'members',
    'tickets',
    'logs',
    'shared',
    'createdAt',
    'deletedAt',
    'processedAt',
    'getCrewOwner',
  ] as const),
) {}
export class SelectCrewIdDto extends PartialType(PickType(Crew, ['id'] as const)) {}
export class SelectCrewChannelDto extends PartialType(PickType(Crew, ['crewSf'] as const)) {}
export class SelectCrewDto extends IntersectionType(SelectCrewIdDto, SelectCrewChannelDto) {
  static from(id: string): SelectCrewDto {
    return /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/.test(id)
      ? { id }
      : { crewSf: id };
  }
}
export class UpdateCrewDto extends PartialType(
  PickType(Crew, [
    'crewSf',
    'roleSf',
    'voiceSf',
    'auditMessageSf',
    'hasMovePrompt',
    'isPermanent',
    'isSecureOnly',
    'isAutomaticPruning',
  ] as const),
) {}
export class DeleteCrewDto extends SelectCrewDto {
  deletedBySf?: Snowflake;
  reason?: string;
}
export class ArchiveCrewDto extends DeleteCrewDto {
  archiveSf?: Snowflake;
  tag?: string;
}
