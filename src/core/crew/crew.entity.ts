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
import { AccessMode, CrewMemberAccess } from 'src/types';
import { Ticket } from 'src/core/ticket/ticket.entity';
import { Team } from 'src/core/team/team.entity';
import { Guild } from 'src/core/guild/guild.entity';
import { CrewMember } from './member/crew-member.entity';
import { CrewLog } from './log/crew-log.entity';
import { CrewShare } from './share/crew-share.entity';
import { CrewAccess, CrewAction } from './crew-access.entity';
import { CrewSetting, CrewSettingName } from './crew-setting.entity';

export type CrewConfig = Partial<Record<CrewSettingName, CrewSetting>>;
export type CrewConfigValue = Partial<Record<CrewSettingName, string>>;

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

  @OneToMany(() => CrewAccess, (access) => access.crew)
  access: CrewAccess[];

  @OneToMany(() => CrewSetting, (setting) => setting.crew)
  settings: CrewSetting[];

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

  getConfig() {
    return this.settings.reduce((config, current) => {
      config[current.name] = current;
      return config;
    }, {} as CrewConfig);
  }

  getAccessRulesForAction(action: CrewAction, access: AccessMode = AccessMode.READ) {
    return this.access.filter((rule) => rule.action === action && rule.access <= access);
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
    'access',
    'settings',
    'createdAt',
    'deletedAt',
    'processedAt',
    'getCrewOwner',
    'getConfig',
    'getAccessRulesForAction',
  ] as const),
) {
  settings?: Partial<Record<CrewSettingName, unknown>>;
}
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
  PickType(Crew, ['crewSf', 'roleSf', 'voiceSf', 'auditMessageSf', 'approvedBy'] as const),
) {}
export class DeleteCrewDto extends SelectCrewDto {
  deletedBySf?: Snowflake;
  reason?: string;
}
export class ArchiveCrewDto extends DeleteCrewDto {
  archiveSf?: Snowflake;
  tag?: string;
}
