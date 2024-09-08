import {
  Entity,
  Column,
  Index,
  PrimaryColumn,
  ManyToOne,
  JoinColumn,
  RelationId,
  CreateDateColumn,
  DeleteDateColumn,
  DeepPartial,
} from 'typeorm';
import { Snowflake } from 'discord.js';
import { Guild } from 'src/core/guild/guild.entity';
import { Crew } from 'src/core/crew/crew.entity';

export type InsertCrewShare = DeepPartial<
  Omit<CrewShare, 'crew' | 'guild' | 'createdAt' | 'deletedAt'>
>;
export type SelectCrewShare = DeepPartial<Pick<CrewShare, 'target' | 'channel'>>;

@Entity({ name: 'crew_share' })
@Index('crew_share_unique', ['target', 'channel'], { unique: true })
export class CrewShare {
  @PrimaryColumn({
    type: 'bigint',
    name: 'crew_channel_sf',
    primaryKeyConstraintName: 'pk_crew_target_guild',
  })
  @RelationId((share: CrewShare) => share.crew)
  channel: Snowflake;

  @ManyToOne(() => Crew, (crew) => crew.members, { onDelete: 'CASCADE' })
  @JoinColumn({
    name: 'crew_channel_sf',
    referencedColumnName: 'channel',
    foreignKeyConstraintName: 'fk_crew_channel_sf_crew_share',
  })
  crew: Crew;

  @PrimaryColumn({
    type: 'bigint',
    name: 'target_guild_sf',
    primaryKeyConstraintName: 'pk_crew_target_guild',
  })
  @RelationId((target: CrewShare) => target.guild)
  @Index('target_guild_sf_idx_crew_share')
  target: Snowflake;

  @ManyToOne(() => Guild)
  @JoinColumn({
    name: 'target_guild_sf',
    referencedColumnName: 'guild',
    foreignKeyConstraintName: 'fk_target_guild_sf_crew_share',
  })
  guild: Guild;

  @Column({ type: 'bigint', name: 'created_by_sf' })
  createdBy: Snowflake;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt: Date;

  @DeleteDateColumn({ type: 'timestamptz', name: 'deleted_at' })
  deletedAt: Date;
}
