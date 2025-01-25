import { Expose, Transform, Type } from 'class-transformer';
import {
  Entity,
  Column,
  Unique,
  DeleteDateColumn,
  Index,
  ViewEntity,
  ViewColumn,
  PrimaryColumn,
  DeepPartial,
  OneToMany,
} from 'typeorm';
import { Poi } from '../poi/poi.entity';

export type SelectRegion = DeepPartial<Pick<Region, 'id'>>;

@Entity()
@Unique('uk_hex_major_minor_deleted_at', ['hexId', 'majorName', 'minorName', 'deletedAt'])
export class Region {
  @PrimaryColumn({
    type: 'uuid',
    default: () => 'uuidv7()',
    primaryKeyConstraintName: 'pk_region_id',
  })
  @Expose()
  id: string;

  @Column({ name: 'hex_id', type: 'int8' })
  @Expose()
  @Index('hex_idx_region')
  hexId: string;

  @Column({ name: 'map_name' })
  @Expose()
  mapName: string;

  @Column({ name: 'hex_name' })
  @Expose()
  hexName: string;

  @Column({ name: 'major_name', nullable: true })
  @Expose()
  majorName?: string;

  @Column({ name: 'minor_name', nullable: true })
  @Expose()
  minorName?: string;

  @Column({ type: 'text', array: true, default: [] })
  @Expose()
  slang?: string[];

  @Column({ type: 'float8' })
  @Expose()
  x: number;

  @Column({ type: 'float8' })
  @Expose()
  y: number;

  @OneToMany(() => Poi, (poi) => poi.region)
  @Type(() => Poi)
  @Transform(({ value }) => (value ? value : null))
  @Expose()
  poi: Poi[];

  @DeleteDateColumn({ name: 'deleted_at', type: 'timestamptz' })
  deletedAt: Date;

  getName() {
    let result = '';

    if (this.minorName) {
      result += this.getMinorName();
    } else if (this.majorName) {
      result += this.getMajorName();
    } else {
      result += this.hexName;
    }

    return result;
  }

  getMinorName() {
    return `${this.minorName} near ${this.getMajorName()}`;
  }

  getMajorName() {
    return `${this.majorName}, ${this.hexName}`;
  }
}

@ViewEntity({
  name: 'region_current',
  expression: (ds) =>
    ds.createQueryBuilder().select().from(Region, 'region').where('deleted_at IS NULL'),
})
export class CurrentRegion {
  @ViewColumn()
  @Expose()
  id: string;

  @ViewColumn({ name: 'hex_id' })
  @Expose()
  hexId: string;

  @ViewColumn({ name: 'map_name' })
  @Expose()
  mapName: string;

  @ViewColumn({ name: 'hex_name' })
  @Expose()
  hexName: string;

  @ViewColumn({ name: 'major_name' })
  @Expose()
  majorName?: string;

  @ViewColumn({ name: 'minor_name' })
  @Expose()
  minorName?: string;

  @ViewColumn()
  @Expose()
  slang?: string[];

  @ViewColumn()
  @Expose()
  x: number;

  @ViewColumn()
  @Expose()
  y: number;

  @OneToMany(() => Poi, (poi) => poi.region)
  @Type(() => Poi)
  @Transform(({ value }) => (value ? value : null))
  @Expose()
  poi: Poi[];

  getName() {
    let result = '';

    if (this.minorName) {
      result += this.getMinorName();
    } else if (this.majorName) {
      result += this.getMajorName();
    } else {
      result += this.hexName;
    }

    return result;
  }

  getMinorName() {
    return `${this.minorName} near ${this.getMajorName()}`;
  }

  getMajorName() {
    return `${this.majorName}, ${this.hexName}`;
  }
}
