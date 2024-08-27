import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  Index,
  RelationId,
  ManyToOne,
  JoinColumn,
  ViewEntity,
  ViewColumn,
} from 'typeorm';
import { War, WarFaction } from 'src/game/war/war.entity';

export type DynamicMapData = {
  teamId: WarFaction;
  iconType: number;
  x: number;
  y: number;
  flags: number;
  viewDirection: number;
};

@Entity()
export class RegionLog {
  @PrimaryGeneratedColumn({ type: 'int8', primaryKeyConstraintName: 'pk_region_log_id' })
  id: string;

  @Column({ name: 'hex_id', type: 'int8' })
  @Index('hex_idx_region_log')
  hexId: string;

  @Column({ name: 'version', type: 'int8' })
  version: string;

  @ManyToOne(() => War, { onDelete: 'RESTRICT', lazy: true })
  @JoinColumn({
    name: 'war_number',
    referencedColumnName: 'warNumber',
    foreignKeyConstraintName: 'fk_region_log_war_number',
  })
  war: Promise<War>;

  @Column({ name: 'war_number', type: 'int8' })
  @RelationId((update: RegionLog) => update.war)
  @Index('war_number_idx_region_log')
  warNumber: string;

  @Column('jsonb')
  data: DynamicMapData;

  @Column({ name: 'updated_at', type: 'timestamptz' })
  @Index('updated_at_idx_region_log')
  updatedAt: Date;
}

@ViewEntity({
  name: 'region_log_current',
  expression: (ds) =>
    ds
      .createQueryBuilder()
      .select()
      .distinctOn(['hex_id'])
      .from(RegionLog, 'log')
      .orderBy('hex_id')
      .addOrderBy('updated_at', 'DESC'),
})
export class CurrentRegionLog {
  @ViewColumn()
  id: string;

  @ViewColumn({ name: 'hex_id' })
  hexId: string;

  @ViewColumn({ name: 'version' })
  version: string;

  @ManyToOne(() => War)
  @JoinColumn({
    name: 'war_number',
    referencedColumnName: 'warNumber',
    foreignKeyConstraintName: 'fk_poi_war_number',
  })
  war: Promise<War>;

  @ViewColumn({ name: 'war_number' })
  warNumber: string;

  @ViewColumn()
  data: DynamicMapData;

  @ViewColumn({ name: 'updated_at' })
  updatedAt: Date;
}
