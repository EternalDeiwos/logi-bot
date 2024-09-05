import {
  Entity,
  Column,
  Index,
  PrimaryColumn,
  ManyToOne,
  JoinColumn,
  RelationId,
  CreateDateColumn,
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

@Entity({ name: 'crew_member' })
@Index('crew_member_unique', ['member', 'channel'], { unique: true })
export class CrewMember {
  @PrimaryColumn({ type: 'bigint', name: 'member_sf' })
  member: Snowflake;

  @Column({ type: 'bigint', name: 'guild_sf' })
  @Index()
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

  @PrimaryColumn({ type: 'bigint', name: 'crew_channel_sf' })
  @RelationId((member: CrewMember) => member.crew)
  channel: Snowflake;

  @ManyToOne(() => Crew, (crew) => crew.members, { onDelete: 'CASCADE', eager: true })
  @JoinColumn({
    name: 'crew_channel_sf',
    referencedColumnName: 'channel',
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
