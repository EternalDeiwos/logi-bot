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
import { Expose } from 'class-transformer';
import { CrewMemberAccess, SkipAccessControlOptions } from 'src/types';
import { Crew } from 'src/core/crew/crew.entity';
import { Guild } from 'src/core/guild/guild.entity';

export type InsertCrewMember = DeepPartial<
  Omit<CrewMember, 'id' | 'crew' | 'guild' | 'createdAt' | 'deletedAt' | 'requireAccess'>
>;
export type SelectCrewMember = DeepPartial<Pick<CrewMember, 'memberSf' | 'crewId'>>;
export type UpdateCrewMember = DeepPartial<Pick<CrewMember, 'name' | 'access'>>;

@Entity('crew_member')
@Unique('uk_crew_member_user_deleted_at', ['crewId', 'memberSf', 'deletedAt'])
export class CrewMember {
  @PrimaryColumn({
    type: 'uuid',
    default: () => 'uuidv7()',
    primaryKeyConstraintName: 'pk_crew_member_id',
  })
  id: string;

  @Column({
    type: 'uuid',
    name: 'crew_id',
  })
  @RelationId((member: CrewMember) => member.crew)
  @Index('crew_id_idx_crew_member')
  crewId: Snowflake;

  @ManyToOne(() => Crew, (crew) => crew.members, { onDelete: 'CASCADE', eager: true })
  @JoinColumn({
    name: 'crew_id',
    referencedColumnName: 'id',
    foreignKeyConstraintName: 'fk_crew_member_crew_id',
  })
  crew: Crew;

  @Expose()
  @Column({
    type: 'int8',
    name: 'member_sf',
  })
  @Index('member_sf_idx_crew_member')
  memberSf: string;

  @Column({ type: 'uuid', name: 'guild_id' })
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

  @Expose()
  @Column()
  name: string;

  @Expose()
  @Column({
    type: 'enum',
    enum: CrewMemberAccess,
    default: CrewMemberAccess.MEMBER,
  })
  access: CrewMemberAccess;

  @Expose()
  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt: Date;

  @Expose()
  @DeleteDateColumn({ type: 'timestamptz', name: 'deleted_at' })
  deletedAt: Date;

  requireAccess(access: CrewMemberAccess, options: Partial<SkipAccessControlOptions> = {}) {
    return options.skipAccessControl || this.access <= access;
  }
}
