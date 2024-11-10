import {
  Entity,
  Column,
  Index,
  RelationId,
  ManyToOne,
  JoinColumn,
  PrimaryColumn,
  CreateDateColumn,
} from 'typeorm';
import { Snowflake } from 'discord.js';
import { Expose, Transform } from 'class-transformer';
import { War } from 'src/game/war/war.entity';
import { Guild } from 'src/core/guild/guild.entity';
import { Poi } from 'src/game/poi/poi.entity';
import { Stockpile } from './stockpile.entity';

@Entity()
export class StockpileLog {
  @PrimaryColumn({
    type: 'uuid',
    default: () => 'uuidv7()',
    primaryKeyConstraintName: 'pk_stockpile_log_id',
  })
  id: string;

  @Column({ name: 'location_id', type: 'int8' })
  @RelationId((stockpile: Stockpile) => stockpile.location)
  @Index('location_id_idx_stockpile_log')
  locationId: string;

  @ManyToOne(() => Poi, { onDelete: 'RESTRICT' })
  @JoinColumn({
    name: 'location_id',
    referencedColumnName: 'id',
    foreignKeyConstraintName: 'fk_stockpile_log_location_id',
  })
  location: Poi;

  @Column({ name: 'war_number', type: 'int8' })
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
  @Transform(({ value }) => (value ? value : null))
  @JoinColumn({
    name: 'guild_id',
    referencedColumnName: 'id',
    foreignKeyConstraintName: 'fk_stockpile_log_guild_id',
  })
  guild: Guild;

  @Column()
  description: string;

  @Column('text')
  raw: string;

  @Expose()
  @Column({ type: 'int8', name: 'created_by_sf' })
  createdBy: Snowflake;

  @Expose()
  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt: Date;
}
