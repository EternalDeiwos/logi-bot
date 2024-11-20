import { Expose } from 'class-transformer';
import {
  Entity,
  Column,
  Unique,
  DeleteDateColumn,
  Index,
  ViewEntity,
  ViewColumn,
  PrimaryColumn,
} from 'typeorm';

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

  @DeleteDateColumn({ name: 'deleted_at', type: 'timestamptz' })
  deletedAt: Date;
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
}
