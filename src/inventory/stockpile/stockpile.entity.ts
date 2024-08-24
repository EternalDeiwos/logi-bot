import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
  RelationId,
  Unique,
} from 'typeorm';
import { Guild } from 'src/core/guild/guild.entity';
import { Poi } from 'src/game/poi/poi.entity';
import { War } from 'src/game/war/war.entity';

@Entity()
@Unique('uk_poi_war_name', ['poiId', 'warNumber', 'name'])
export class Stockpile {
  @PrimaryGeneratedColumn({ type: 'int8', primaryKeyConstraintName: 'pk_stockpile_id' })
  id: number;

  @Column({ name: 'guild_id', type: 'int8' })
  @RelationId((stockpile: Stockpile) => stockpile.guild)
  @Index('guild_id_idx_stockpile')
  guildId: string;

  @ManyToOne(() => Guild, { lazy: true })
  @JoinColumn({
    name: 'guild_id',
    referencedColumnName: 'id',
    foreignKeyConstraintName: 'fk_stockpile_guild_id',
  })
  guild: Promise<Guild>;

  @Column({ name: 'poi_id', type: 'int8' })
  @RelationId((stockpile: Stockpile) => stockpile.poi)
  @Index('poi_id_idx_stockpile')
  poiId: string;

  @ManyToOne(() => Poi, { eager: true })
  @JoinColumn({
    name: 'poi_id',
    referencedColumnName: 'id',
    foreignKeyConstraintName: 'fk_stockpile_poi_id',
  })
  poi: Poi;

  @Column({ name: 'war_number', type: 'int8' })
  @RelationId((stockpile: Stockpile) => stockpile.war)
  @Index('war_number_idx_stockpile')
  warNumber: string;

  @ManyToOne(() => War, { lazy: true })
  @JoinColumn({
    name: 'war_number',
    referencedColumnName: 'warNumber',
    foreignKeyConstraintName: 'fk_stockpile_war_number',
  })
  war: Promise<War>;

  @Column()
  @Index('name_idx_stockpile')
  name: string;

  @Column({ default: '000000' })
  code: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @DeleteDateColumn({ name: 'deleted_at', type: 'timestamptz' })
  deletedAt: Date;
}
