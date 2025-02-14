import { OmitType, PartialType } from '@nestjs/swagger';
import {
  Entity,
  Column,
  Index,
  CreateDateColumn,
  RelationId,
  ManyToOne,
  JoinColumn,
  DeleteDateColumn,
  PrimaryColumn,
} from 'typeorm';
import { Snowflake } from 'discord.js';
import { Expose, Transform } from 'class-transformer';
import { Crew } from 'src/core/crew/crew.entity';
import { Guild } from 'src/core/guild/guild.entity';

@Entity('crew_log')
export class CrewLog {
  @PrimaryColumn({
    type: 'uuid',
    default: () => 'uuidv7()',
    primaryKeyConstraintName: 'pk_crew_log_id',
  })
  id: string;

  @Column({ type: 'int8', name: 'message_sf' })
  @Expose()
  @Index('message_sf_idx_crew_log')
  messageSf: Snowflake;

  @Column({ type: 'uuid', name: 'guild_id' })
  @Index('guild_id_idx_crew_log')
  @RelationId((log: CrewLog) => log.guild)
  guildId: string;

  @ManyToOne(() => Guild, { onDelete: 'CASCADE', eager: true })
  @Expose()
  @JoinColumn({
    name: 'guild_id',
    referencedColumnName: 'id',
    foreignKeyConstraintName: 'fk_crew_log_guild_id',
  })
  guild: Guild;

  @Column({ type: 'uuid', name: 'crew_id' })
  @Expose()
  @Index('crew_id_idx_crew_log')
  @RelationId((log: CrewLog) => log.crew)
  crewId: Snowflake;

  @ManyToOne(() => Crew, (crew) => crew.logs, { onDelete: 'CASCADE', eager: true })
  @Expose()
  @Transform(({ value }) => (value ? value : null))
  @JoinColumn({
    name: 'crew_id',
    referencedColumnName: 'id',
    foreignKeyConstraintName: 'fk_crew_log_crew_id',
  })
  crew: Crew;

  @Column({ name: 'content', type: 'text' })
  @Expose()
  content: string;

  @Column({ type: 'int8', name: 'created_by_sf' })
  @Expose()
  createdBy: Snowflake;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  @Expose()
  createdAt: Date;

  @DeleteDateColumn({ type: 'timestamptz', name: 'deleted_at' })
  @Expose()
  deletedAt: Date;
}

export class InsertCrewLogDto extends PartialType(
  OmitType(CrewLog, ['createdAt', 'deletedAt', 'crew', 'guild'] as const),
) {}
