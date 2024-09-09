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
  DeepPartial,
  DeleteDateColumn,
  Unique,
} from 'typeorm';
import { CrewMemberAccess, SkipAccessControlOptions } from 'src/types';
import { Crew } from 'src/core/crew/crew.entity';
import { Guild } from 'src/core/guild/guild.entity';

export type InsertCrewMember = DeepPartial<Omit<CrewMember, 'crew' | 'createdAt' | 'deletedAt'>>;
export type SelectCrewMember = DeepPartial<Pick<CrewMember, 'memberSf' | 'crewSf'>>;
export type UpdateCrewMember = DeepPartial<Pick<CrewMember, 'name' | 'access'>>;

@Entity('crew_member')
@Unique('uk_crew_channel_member_deleted_at', ['crewSf', 'memberSf', 'deletedAt'])
export class CrewMember {
  @PrimaryColumn({ default: () => 'uuidv7()', primaryKeyConstraintName: 'pk_crew_member_id' })
  id: string;

  @Column({
    type: 'int8',
    name: 'crew_channel_sf',
  })
  @RelationId((member: CrewMember) => member.crew)
  @Index('crew_channel_sf_idx_crew_member')
  crewSf: Snowflake;

  @ManyToOne(() => Crew, (crew) => crew.members, { onDelete: 'CASCADE', eager: true })
  @JoinColumn({
    name: 'crew_channel_sf',
    referencedColumnName: 'crewSf',
    foreignKeyConstraintName: 'fk_crew_member_crew_channel_sf',
  })
  crew: Crew;

  @Column({
    type: 'int8',
    name: 'member_sf',
  })
  @Index('member_sf_idx_crew_member')
  memberSf: string;

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

  @DeleteDateColumn({ type: 'timestamptz', name: 'deleted_at' })
  deletedAt: Date;

  requireAccess(access: CrewMemberAccess, options: Partial<SkipAccessControlOptions> = {}) {
    return options.skipAccessControl || this.access <= access;
  }
}
