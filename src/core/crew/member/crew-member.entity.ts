import {
  Entity,
  Column,
  Index,
  PrimaryColumn,
  ManyToOne,
  JoinColumn,
  RelationId,
  CreateDateColumn,
  DeepPartial,
} from 'typeorm';
import { Crew } from 'src/core/crew/crew.entity';
import { Snowflake } from 'discord.js';
import { AdminOverrideOptions, DeleteOptions, SkipAccessControlOptions } from 'src/types';

export enum CrewMemberAccess {
  OWNER = 0,
  ADMIN = 1,
  MEMBER = 10,
  SUBSCRIBED = 100,
}

export type InsertCrewMember = DeepPartial<Omit<CrewMember, 'crew' | 'createdAt' | 'deletedAt'>>;
export type SelectCrewMember = DeepPartial<Pick<CrewMember, 'member' | 'channel'>>;
export type UpdateCrewMember = DeepPartial<Pick<CrewMember, 'name' | 'icon' | 'access'>>;

@Entity({ name: 'crew_member' })
// @Index('uk_crew_member', ['member', 'channel'], { unique: true })
export class CrewMember {
  @PrimaryColumn({ type: 'bigint', name: 'member_sf', primaryKeyConstraintName: 'pk_crew_member' })
  member: Snowflake;

  @Column({ type: 'bigint', name: 'guild_sf' })
  @Index('guild_sf_idx_crew_member')
  guild: Snowflake;

  @Column()
  name: string;

  @Column({ nullable: true })
  icon: string;

  @Column({
    type: 'enum',
    enum: CrewMemberAccess,
    default: CrewMemberAccess.MEMBER,
  })
  access: CrewMemberAccess;

  @PrimaryColumn({
    type: 'bigint',
    name: 'crew_channel_sf',
    primaryKeyConstraintName: 'pk_crew_member',
  })
  @RelationId((member: CrewMember) => member.crew)
  @Index('crew_channel_sf_idx_crew_member')
  channel: Snowflake;

  @ManyToOne(() => Crew, (crew) => crew.members, { onDelete: 'CASCADE', eager: true })
  @JoinColumn({
    name: 'crew_channel_sf',
    referencedColumnName: 'channel',
    foreignKeyConstraintName: 'fk_crew_channel_sf_crew_member',
  })
  crew: Crew;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt: Date;

  requireAccess(
    access: CrewMemberAccess,
    options: Partial<AdminOverrideOptions & SkipAccessControlOptions> = {},
  ) {
    return options.skipAccessControl || options.isAdmin || this.access <= access;
  }
}
