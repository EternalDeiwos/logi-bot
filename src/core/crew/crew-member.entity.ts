import { Snowflake } from 'discord.js';
import {
  Entity,
  Column,
  Index,
  PrimaryColumn,
  ManyToOne,
  JoinColumn,
  RelationId,
  CreateDateColumn,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { CrewMemberAccess, SkipAccessControlOptions } from 'src/types';
import { Crew } from 'src/core/crew/crew.entity';
import { Guild } from 'src/core/guild/guild.entity';

@Entity('crew_member')
export class CrewMember {
  @PrimaryColumn({
    type: 'int8',
    name: 'crew_channel_sf',
    primaryKeyConstraintName: 'pk_crew_member_id',
  })
  @RelationId((member: CrewMember) => member.crew)
  crewSf: Snowflake;

  @ManyToOne(() => Crew, (crew) => crew.members, { onDelete: 'CASCADE', eager: true })
  @JoinColumn({
    name: 'crew_channel_sf',
    referencedColumnName: 'crewSf',
    foreignKeyConstraintName: 'fk_crew_member_crew_channel_sf',
  })
  crew: Crew;

  @PrimaryGeneratedColumn({
    type: 'int8',
    name: 'member_id',
    primaryKeyConstraintName: 'pk_crew_member_id',
  })
  memberId: string;

  @Column({ type: 'int8', name: 'guild_id' })
  @Index('guild_id_idx_crew_member')
  @RelationId((member: CrewMember) => member.guild)
  guildId: string;

  @ManyToOne(() => Guild, { onDelete: 'CASCADE', eager: true })
  @JoinColumn({
    name: 'guild_id',
    referencedColumnName: 'id',
    foreignKeyConstraintName: 'fk_crew_member_guild_id',
  })
  guild: Guild;

  @Column()
  name: string;

  @Column({
    type: 'enum',
    enum: CrewMemberAccess,
    default: CrewMemberAccess.MEMBER,
  })
  access: CrewMemberAccess;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt: Date;

  requireAccess(access: CrewMemberAccess, options: Partial<SkipAccessControlOptions> = {}) {
    return options.skipAccessControl || this.access <= access;
  }
}
