import {
  Entity,
  Column,
  PrimaryColumn,
  ManyToOne,
  JoinColumn,
  RelationId,
  CreateDateColumn,
  DeleteDateColumn,
  Unique,
  DeepPartial,
} from 'typeorm';
import { Snowflake } from 'discord.js';
import { Guild } from 'src/core/guild/guild.entity';
import { Crew } from 'src/core/crew/crew.entity';

export type InsertCrewShare = DeepPartial<
  Omit<CrewShare, 'crew' | 'guild' | 'createdAt' | 'deletedAt'>
>;
export type SelectCrewShare = DeepPartial<Pick<CrewShare, 'guildId' | 'crewSf'>>;

@Entity('crew_share')
@Unique('uk_share_target_guild_crew_deleted_at', ['guildId', 'crewSf', 'deletedAt'])
export class CrewShare {
  @PrimaryColumn({
    type: 'uuid',
    name: 'crew_id',
    primaryKeyConstraintName: 'pk_crew_share',
  })
  @RelationId((share: CrewShare) => share.crew)
  crewId: Snowflake;

  /**
   * Snowflake for crew Discord channel
   * @type Snowflake
   */
  @Column({
    type: 'int8',
    name: 'crew_channel_sf',
  })
  crewSf: Snowflake;

  @ManyToOne(() => Crew, (crew) => crew.members, { onDelete: 'CASCADE' })
  @JoinColumn({
    name: 'crew_id',
    referencedColumnName: 'id',
    foreignKeyConstraintName: 'fk_crew_share_crew_id',
  })
  crew: Crew;

  @PrimaryColumn({
    type: 'uuid',
    name: 'target_guild_id',
    primaryKeyConstraintName: 'pk_crew_share',
  })
  @RelationId((target: CrewShare) => target.guild)
  guildId: string;

  @ManyToOne(() => Guild, (guild) => guild.shared, { onDelete: 'CASCADE' })
  @JoinColumn({
    name: 'target_guild_id',
    referencedColumnName: 'id',
    foreignKeyConstraintName: 'fk_crew_share_guild_id',
  })
  guild: Guild;

  @Column({ type: 'int8', name: 'created_by_sf' })
  createdBy: Snowflake;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt: Date;

  @DeleteDateColumn({ type: 'timestamptz', name: 'deleted_at' })
  deletedAt: Date;
}
