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
  id: string;

  @Column({ name: 'hex_id', type: 'int8' })
  @Index('hex_idx_region')
  hexId: string;

  @Column({ name: 'map_name' })
  mapName: string;

  @Column({ name: 'hex_name' })
  hexName: string;

  @Column({ name: 'major_name', nullable: true })
  majorName?: string;

  @Column({ name: 'minor_name', nullable: true })
  minorName?: string;

  @Column({ type: 'text', array: true, default: [] })
  slang?: string[];

  @Column({ type: 'float8' })
  x: number;

  @Column({ type: 'float8' })
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
  id: string;

  @ViewColumn({ name: 'hex_id' })
  hexId: string;

  @ViewColumn({ name: 'map_name' })
  mapName: string;

  @ViewColumn({ name: 'hex_name' })
  hexName: string;

  @ViewColumn({ name: 'major_name' })
  majorName?: string;

  @ViewColumn({ name: 'minor_name' })
  minorName?: string;

  @ViewColumn()
  slang?: string[];

  @ViewColumn()
  x: number;

  @ViewColumn()
  y: number;
}
