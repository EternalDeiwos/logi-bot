import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  Index,
  RelationId,
  ManyToOne,
  JoinColumn,
  ViewEntity,
  DeleteDateColumn,
  DeepPartial,
  OneToMany,
} from 'typeorm';
import { Expose, Transform, Type } from 'class-transformer';
import { Snowflake } from 'discord.js';
import { War } from 'src/game/war/war.entity';
import { Region } from 'src/game/region/region.entity';
import { Stockpile } from 'src/inventory/stockpile/stockpile.entity';
import { StockpileLog } from 'src/inventory/stockpile/stockpile-log.entity';

export enum PoiMarkerType {
  DEPOT = 33,
  SEAPORT = 52,
}

export type SelectPoi = DeepPartial<Pick<Poi, 'id'>>;
export type ArchivePoi = SelectPoi & { archiveSf?: Snowflake; tag?: string };

@Entity()
export class Poi {
  @PrimaryGeneratedColumn({ type: 'int8', primaryKeyConstraintName: 'pk_poi_id' })
  @Expose()
  id: string;

  @Column({ type: 'uuid', name: 'region_id' })
  @RelationId((poi: Poi) => poi.region)
  @Index('region_idx_poi')
  regionId: string;

  @ManyToOne(() => Region, { onDelete: 'RESTRICT' })
  @Expose()
  @Type(() => Region)
  @Transform(({ value }) => (value ? value : null))
  @JoinColumn({
    name: 'region_id',
    referencedColumnName: 'id',
    foreignKeyConstraintName: 'fk_poi_region_id',
  })
  region: Region;

  @Column({ name: 'war_number', type: 'int8' })
  @Expose()
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

  @Expose()
  @Type(() => Stockpile)
  @Transform(({ value }) => (value ? value : null))
  @OneToMany(() => Stockpile, (stockpile) => stockpile.location)
  stockpiles: Stockpile[];

  @Expose()
  @Type(() => StockpileLog)
  @Transform(({ value }) => (value ? value : null))
  @OneToMany(() => StockpileLog, (log) => log.location)
  logs: StockpileLog[];

  @Column({ name: 'marker_type', type: 'int4' })
  @Expose()
  @Index('marker_type_idx_poi')
  markerType: PoiMarkerType;

  @Column({ type: 'float8' })
  @Expose()
  x: number;

  @Column({ type: 'float8' })
  @Expose()
  y: number;

  @DeleteDateColumn({ name: 'deleted_at', type: 'timestamptz' })
  @Expose()
  deletedAt: Date;

  getName() {
    let result = this.getMarkerName();

    if (this.region.minorName) {
      result += this.getMinorName();
    } else if (this.region.majorName) {
      result += this.getMajorName();
    } else {
      result += this.region.hexName;
    }

    return result;
  }

  getMarkerName() {
    switch (this.markerType) {
      case 33:
        return 'Depot at ';
      case 52:
        return 'Seaport at ';
      default:
        return '';
    }
  }

  getMinorName() {
    if (this.region.minorName) {
      return `${this.region.minorName} near ${this.getMajorName()}`;
    }

    return this.getMajorName();
  }

  getMajorName() {
    return `${this.region.majorName}, ${this.region.hexName}`;
  }
}

@ViewEntity({
  name: 'poi_expanded',
  expression: (ds) =>
    ds
      .createQueryBuilder(Poi, 'p')
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
        'p.deleted_at deleted_at',
      ])
      .innerJoin('p.region', 'r'),
})
export class ExpandedPoi {
  @Column({ type: 'int8' })
  @Expose()
  id: string;

  @Column({ type: 'int8', name: 'hex_id' })
  @Expose()
  hexId: string;

  @Column({ type: 'uuid', name: 'region_id' })
  regionId: string;

  @Column({ type: 'int8', name: 'war_number' })
  @Expose()
  warNumber: string;

  @Column({ type: 'float8' })
  @Expose()
  x: number;

  @Column({ type: 'float8' })
  @Expose()
  y: number;

  @Column({ type: 'float8' })
  @Expose()
  rx: number;

  @Column({ type: 'float8' })
  @Expose()
  ry: number;

  @Column({ name: 'marker_type', type: 'int4' })
  @Expose()
  markerType: PoiMarkerType;

  @Column({ name: 'hex_name' })
  @Expose()
  hexName: string;

  @Column({ name: 'major_name' })
  @Expose()
  majorName: string;

  @Column({ name: 'minor_name' })
  @Expose()
  minorName: string;

  @Column({ type: 'text', array: true })
  @Expose()
  slang: string[];

  @Column({ name: 'deleted_at' })
  @Expose()
  deletedAt?: Date;

  @OneToMany(() => Stockpile, (stockpile) => stockpile.expandedLocation, {
    createForeignKeyConstraints: false,
  })
  @Expose()
  @Type(() => Stockpile)
  @Transform(({ value }) => (value ? value : null))
  stockpiles: Stockpile[];

  @OneToMany(() => StockpileLog, (log) => log.expandedLocation, {
    createForeignKeyConstraints: false,
  })
  @Expose()
  @Type(() => StockpileLog)
  @Transform(({ value }) => (value ? value : null))
  logs: StockpileLog[];

  getName() {
    let result = this.getMarkerName();

    if (this.minorName) {
      result += this.getMinorName();
    } else if (this.majorName) {
      result += this.getMajorName();
    } else {
      result += this.hexName;
    }

    return result;
  }

  getMarkerName() {
    switch (this.markerType) {
      case 33:
        return 'Depot at ';
      case 52:
        return 'Seaport at ';
      default:
        return '';
    }
  }

  getMinorName() {
    return `${this.minorName} near ${this.getMajorName()}`;
  }

  getMajorName() {
    return `${this.majorName}, ${this.hexName}`;
  }
}
