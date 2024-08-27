import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
  RelationId,
} from 'typeorm';
import { Guild } from 'src/core/guild/guild.entity';
import { War } from 'src/game/war/war.entity';
import { Stockpile } from './stockpile.entity';

@Entity()
export class StockpileLog {
  @PrimaryGeneratedColumn({ type: 'int8', primaryKeyConstraintName: 'pk_stockpile_log_id' })
  id: string;

  @Column({ name: 'guild_id', type: 'int8' })
  @RelationId((log: StockpileLog) => log.guild)
  @Index('guild_id_idx_stockpile_log')
  guildId: string;

  @ManyToOne(() => Guild, { lazy: true })
  @JoinColumn({
    name: 'guild_id',
    referencedColumnName: 'id',
    foreignKeyConstraintName: 'fk_stockpile_log_guild_id',
  })
  guild: Promise<Guild>;

  @Column({ name: 'war_number', type: 'int8' })
  @RelationId((log: StockpileLog) => log.war)
  @Index('war_number_idx_stockpile_log')
  warNumber: string;

  @ManyToOne(() => War, { lazy: true })
  @JoinColumn({
    name: 'war_number',
    referencedColumnName: 'warNumber',
    foreignKeyConstraintName: 'fk_stockpile_log_war_number',
  })
  war: Promise<War>;

  @Column({ name: 'stockpile_id', type: 'int8' })
  @RelationId((log: StockpileLog) => log.stockpile)
  @Index('stockpile_id_idx_stockpile_log')
  stockpileId: string;

  @ManyToOne(() => Stockpile, { eager: true })
  @JoinColumn({
    name: 'stockpile_id',
    referencedColumnName: 'id',
    foreignKeyConstraintName: 'fk_stockpile_log_stockpile_id',
  })
  stockpile: Stockpile;

  @Column({ comment: 'A player-provided message describing the change in a stockpile' })
  description: string;

  @Column({ name: 'screenshot_path', nullable: true })
  screenshotPath?: string;

  @Column({ name: 'created_by_sf', type: 'int8' })
  createdBy: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
