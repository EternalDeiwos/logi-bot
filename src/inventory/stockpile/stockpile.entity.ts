import { Snowflake } from 'discord.js';
import { Expose, Transform, Type } from 'class-transformer';
import {
  Entity,
  Column,
  DeleteDateColumn,
  Index,
  PrimaryColumn,
  ManyToOne,
  JoinColumn,
  RelationId,
  CreateDateColumn,
  DeepPartial,
  Unique,
  OneToMany,
} from 'typeorm';
import { War } from 'src/game/war/war.entity';
import { ExpandedPoi, Poi } from 'src/game/poi/poi.entity';
import { Guild } from 'src/core/guild/guild.entity';
import { StockpileEntry } from './stockpile-entry.entity';
import { StockpileAccess } from './stockpile-access.entity';

export type SelectStockpile = DeepPartial<Pick<Stockpile, 'id'>>;
export type InsertStockpile = DeepPartial<
  Omit<
    Stockpile,
    | 'id'
    | 'war'
    | 'location'
    | 'guild'
    | 'entries'
    | 'items'
    | 'access'
    | 'deletedAt'
    | 'deletedBy'
    | 'createdAt'
  >
>;

@Entity()
@Unique('uk_stockpile_location_name', ['locationId', 'name', 'deletedAt'])
export class Stockpile {
  @PrimaryColumn({
    type: 'uuid',
    default: () => 'uuidv7()',
    primaryKeyConstraintName: 'pk_stockpile_id',
  })
  @Expose()
  id: string;

  @Column({ name: 'location_id', type: 'int8' })
  @RelationId((stockpile: Stockpile) => stockpile.location)
  @Index('location_id_idx_stockpile')
  locationId: string;

  @ManyToOne(() => Poi, (poi) => poi.stockpiles, { onDelete: 'RESTRICT' })
  @JoinColumn({
    name: 'location_id',
    referencedColumnName: 'id',
    foreignKeyConstraintName: 'fk_stockpile_location_id',
  })
  location: Poi;

  @ManyToOne(() => ExpandedPoi, (poi) => poi.stockpiles, { createForeignKeyConstraints: false })
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
  @RelationId((stockpile: Stockpile) => stockpile.war)
  @Index('war_number_idx_stockpile')
  warNumber: string;

  @ManyToOne(() => War, { onDelete: 'RESTRICT' })
  @JoinColumn({
    name: 'war_number',
    referencedColumnName: 'warNumber',
    foreignKeyConstraintName: 'fk_stockpile_war_number',
  })
  war: War;

  @Column({ type: 'uuid', name: 'guild_id' })
  @RelationId((stockpile: Stockpile) => stockpile.guild)
  @Index('guild_id_idx_stockpile')
  guildId: string;

  @ManyToOne(() => Guild, { onDelete: 'CASCADE', eager: true })
  @Expose()
  @Type(() => Guild)
  @Transform(({ value }) => (value ? value : null))
  @JoinColumn({
    name: 'guild_id',
    referencedColumnName: 'id',
    foreignKeyConstraintName: 'fk_stockpile_guild_id',
  })
  guild: Guild;

  @Expose()
  @Column()
  name: string;

  @Column({ default: '000000' })
  code: string;

  @Expose()
  @Type(() => StockpileEntry)
  @Transform(({ value }) => (value ? value : null))
  @OneToMany(() => StockpileEntry, (entry) => entry.stockpile)
  items: StockpileEntry[];

  @Expose()
  @Type(() => StockpileAccess)
  @Transform(({ value }) => (value ? value : null))
  @OneToMany(() => StockpileAccess, (entry) => entry.stockpile)
  access: StockpileAccess[];

  @Expose()
  @Column({ type: 'int8', name: 'created_by_sf' })
  createdBy: Snowflake;

  @Expose()
  @Column({ type: 'int8', name: 'deleted_by_sf', nullable: true })
  deletedBy: Snowflake;

  @Expose()
  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt: Date;

  @Expose()
  @DeleteDateColumn({ type: 'timestamptz', name: 'deleted_at' })
  deletedAt: Date;
}
