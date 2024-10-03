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
  DeleteDateColumn,
  Point,
} from 'typeorm';
import { War } from 'src/game/war/war.entity';
import { Region } from 'src/game/region/region.entity';

@Entity()
export class Poi {
  @PrimaryGeneratedColumn({ type: 'int8', primaryKeyConstraintName: 'pk_poi_id' })
  id: string;

  @Column({ type: 'uuid', name: 'region_id' })
  @RelationId((poi: Poi) => poi.region)
  @Index('region_idx_poi')
  regionId: string;

  @ManyToOne(() => Region, { onDelete: 'RESTRICT' })
  @JoinColumn({
    name: 'region_id',
    referencedColumnName: 'id',
    foreignKeyConstraintName: 'fk_poi_region_id',
  })
  region: Region;

  @Column({ name: 'war_number', type: 'int8' })
  @RelationId((poi: Poi) => poi.war)
  @Index('war_number_idx_poi')
  warNumber: string;

  @ManyToOne(() => War, { onDelete: 'RESTRICT' })
  @JoinColumn({
    name: 'war_number',
    referencedColumnName: 'warNumber',
    foreignKeyConstraintName: 'fk_poi_war_number',
  })
  war: War;

  @Column({ name: 'marker_type', type: 'int4' })
  @Index('marker_type_idx_poi')
  markerType: number;

  @Column({ type: 'float8' })
  x: number;

  @Column({ type: 'float8' })
  y: number;

  @DeleteDateColumn({ name: 'deleted_at', type: 'timestamptz' })
  deletedAt: Date;
}

@ViewEntity({
  name: 'poi_current',
  expression: (ds) =>
    ds
      .createQueryBuilder()
      .select([
        'p.id id',
        'r.hex_id hex_id',
        'p.region_id region_id',
        'p.war_number war_number',
        'p.x x',
        'p.y y',
        'p.marker_type marker_type',
        'r.x rx',
        'r.y ry',
        'r.hex_name hex_name',
        'r.major_name major_name',
        'r.minor_name minor_name',
        'r.slang slang',
      ])
      .from(Poi, 'p')
      .innerJoin(Region, 'r', 'r.id=p.region_id')
      .where('p.deleted_at IS NULL'),
})
export class CurrentPoi {
  @ViewColumn()
  id: string;

  @ViewColumn({ name: 'hex_id' })
  hexId: string;

  @ViewColumn({ name: 'region_id' })
  regionId: string;

  @ViewColumn({ name: 'war_number' })
  warNumber: string;

  @ViewColumn()
  x: number;

  @ViewColumn()
  y: number;

  @ViewColumn()
  rx: number;

  @ViewColumn()
  ry: number;

  @ViewColumn({ name: 'marker_type' })
  markerType: number;

  @ViewColumn({ name: 'region_point' })
  regionPoint: Point;

  @ViewColumn({ name: 'hex_name' })
  hexName: string;

  @ViewColumn({ name: 'major_name' })
  majorName: string;

  @ViewColumn({ name: 'minor_name' })
  minorName: string;

  @ViewColumn()
  slang: string[];
}
