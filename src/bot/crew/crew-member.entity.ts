import {
  Entity,
  Column,
  Index,
  PrimaryColumn,
  ManyToOne,
  JoinColumn,
  RelationId,
  CreateDateColumn,
  Unique,
} from 'typeorm';
import { Crew } from './crew.entity';
import { Snowflake } from 'discord.js';

export enum CrewMemberAccess {
  OWNER = 0,
  ADMIN = 1,
  MEMBER = 10,
  SUBSCRIBED = 100,
}

@Entity({ name: 'crew_member' })
@Unique('unique_crew_member', ['channel', 'member'])
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

  @Column({ type: 'bigint', name: 'crew_channel_sf' })
  @RelationId((member: CrewMember) => member.crew)
  channel: Snowflake;

  @ManyToOne(() => Crew, (crew) => crew.members, { onDelete: 'CASCADE' })
  @JoinColumn({
    name: 'crew_channel_sf',
    referencedColumnName: 'channel',
  })
  crew: Crew;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt: Date;
}