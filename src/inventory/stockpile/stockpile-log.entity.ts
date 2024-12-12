import {
  Entity,
  Column,
  Index,
  RelationId,
  ManyToOne,
  JoinColumn,
  PrimaryColumn,
  CreateDateColumn,
  DeleteDateColumn,
  DeepPartial,
  OneToMany,
} from 'typeorm';
import { Snowflake } from 'discord.js';
import { Expose, Transform, Type } from 'class-transformer';
import { War } from 'src/game/war/war.entity';
import { Guild } from 'src/core/guild/guild.entity';
import { ExpandedPoi, Poi } from 'src/game/poi/poi.entity';
import { Crew } from 'src/core/crew/crew.entity';
import { StockpileEntry } from './stockpile-entry.entity';
import { StockpileDiff } from './stockpile-diff.entity';

export type SelectStockpileLog = DeepPartial<Pick<StockpileLog, 'id'>>;
export type InsertStockpileLog = DeepPartial<
  Omit<
    StockpileLog,
    | 'id'
    | 'war'
    | 'location'
    | 'guild'
    | 'crew'
    | 'processedAt'
    | 'deletedAt'
    | 'deletedBy'
    | 'createdAt'
  >
>;

@Entity()
export class StockpileLog {
  @Expose()
  @PrimaryColumn({
    type: 'uuid',
    default: () => 'uuidv7()',
    primaryKeyConstraintName: 'pk_stockpile_log_id',
  })
  id: string;

  @Column({ name: 'crew_channel_sf', type: 'int8', nullable: true })
  @RelationId((log: StockpileLog) => log.crew)
  @Index('crew_channel_sf_idx_stockpile_log')
  crewSf: string;

  @Column({ name: 'crew_id', type: 'uuid', nullable: true })
  @RelationId((log: StockpileLog) => log.crew)
  @Index('crew_id_idx_stockpile_log')
  crewId: string;

  @ManyToOne(() => Crew, { onDelete: 'NO ACTION' })
  @Expose()
  @Type(() => Crew)
  @Transform(({ value }) => (value ? value : null))
  @JoinColumn({
    name: 'crew_id',
    referencedColumnName: 'id',
    foreignKeyConstraintName: 'fk_stockpile_log_crew_id',
  })
  crew: Crew;

  @Column({ name: 'location_id', type: 'int8' })
  @RelationId((log: StockpileLog) => log.location)
  @Index('location_id_idx_stockpile_log')
  locationId: string;

  @ManyToOne(() => Poi, (poi) => poi.logs, { onDelete: 'RESTRICT' })
  @Expose()
  @Type(() => Poi)
  @Transform(({ value }) => (value ? value : null))
  @JoinColumn({
    name: 'location_id',
    referencedColumnName: 'id',
    foreignKeyConstraintName: 'fk_stockpile_log_location_id',
  })
  location: Poi;

  @ManyToOne(() => ExpandedPoi, (poi) => poi.logs, { createForeignKeyConstraints: false })
  @Expose({ name: 'location' })
  @Type(() => ExpandedPoi)
  @Transform(({ value }) => (value ? value : null))
  @JoinColumn({
    name: 'location_id',
    referencedColumnName: 'id',
  })
  expandedLocation: ExpandedPoi;

  @Column({ name: 'war_number', type: 'int8' })
  @Expose()
  @RelationId((log: StockpileLog) => log.war)
  @Index('war_number_idx_stockpile_log')
  warNumber: string;

  @ManyToOne(() => War, { onDelete: 'RESTRICT' })
  @JoinColumn({
    name: 'war_number',
    referencedColumnName: 'warNumber',
    foreignKeyConstraintName: 'fk_stockpile_log_war_number',
  })
  war: War;

  @Column({ type: 'uuid', name: 'guild_id' })
  @RelationId((log: StockpileLog) => log.guild)
  @Index('guild_id_idx_stockpile_log')
  guildId: string;

  @ManyToOne(() => Guild, { onDelete: 'CASCADE', eager: true })
  @Expose()
  @Type(() => Guild)
  @Transform(({ value }) => (value ? value : null))
  @JoinColumn({
    name: 'guild_id',
    referencedColumnName: 'id',
    foreignKeyConstraintName: 'fk_stockpile_log_guild_id',
  })
  guild: Guild;

  @Column()
  message: string;

  @Column('text')
  raw: string;

  @Expose()
  @Type(() => StockpileEntry)
  @Transform(({ value }) => (value ? value : null))
  @OneToMany(() => StockpileEntry, (entry) => entry.log)
  entries: StockpileEntry[];

  @Expose()
  @Type(() => StockpileDiff)
  @Transform(({ value }) => (value ? value : null))
  @OneToMany(() => StockpileDiff, (diff) => diff.currentLog)
  diff: StockpileDiff[];

  @Column({ type: 'timestamptz', name: 'processed_at', nullable: true })
  processedAt: Date;

  @Expose()
  @Column({ type: 'int8', name: 'created_by_sf' })
  createdBy: Snowflake;

  @Expose()
  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt: Date;

  @Expose()
  @Column({ type: 'int8', name: 'deleted_by_sf', nullable: true })
  deletedBy: Snowflake;

  @Expose()
  @DeleteDateColumn({ type: 'timestamptz', name: 'deleted_at' })
  deletedAt: Date;
}
