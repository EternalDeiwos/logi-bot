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
  OneToMany,
  ViewEntity,
} from 'typeorm';
import { War } from 'src/game/war/war.entity';
import { Catalog, ExpandedCatalog } from 'src/game/catalog/catalog.entity';
import { Guild } from 'src/core/guild/guild.entity';
import { Crew } from 'src/core/crew/crew.entity';
import { CounterAccess } from './counter-access.entity';
import { CounterEntry } from './counter-entry.entity';

export enum CounterKind {
  SIMPLE = 'Simple',
  RESERVE = 'Reserve',
  EXPORT = 'Export',
  KILL = 'Kill',
}

export class CounterMetadata {}

@Entity()
export class Counter {
  @PrimaryColumn({
    type: 'uuid',
    default: () => 'uuidv7()',
    primaryKeyConstraintName: 'pk_counter_id',
  })
  @Expose()
  id: string;

  @Column({ name: 'war_number', type: 'int8' })
  @Expose()
  @RelationId((counter: Counter) => counter.war)
  @Index('war_number_idx_counter')
  warNumber: string;

  @ManyToOne(() => War, { onDelete: 'RESTRICT' })
  @JoinColumn({
    name: 'war_number',
    referencedColumnName: 'warNumber',
    foreignKeyConstraintName: 'fk_counter_war_number',
  })
  war: War;

  @Column({ type: 'uuid', name: 'guild_id' })
  @RelationId((counter: Counter) => counter.guild)
  @Index('guild_id_idx_counter')
  guildId: string;

  @ManyToOne(() => Guild, { onDelete: 'CASCADE', eager: true })
  @Expose()
  @Type(() => Guild)
  @Transform(({ value }) => (value ? value : null))
  @JoinColumn({
    name: 'guild_id',
    referencedColumnName: 'id',
    foreignKeyConstraintName: 'fk_counter_guild_id',
  })
  guild: Guild;

  @Column({ name: 'crew_id', type: 'uuid', nullable: true })
  @RelationId((counter: Counter) => counter.crew)
  @Index('crew_id_idx_counter')
  crewId: string;

  @ManyToOne(() => Crew, { onDelete: 'NO ACTION' })
  @Expose()
  @Type(() => Crew)
  @Transform(({ value }) => (value ? value : null))
  @JoinColumn({
    name: 'crew_id',
    referencedColumnName: 'id',
    foreignKeyConstraintName: 'fk_counter_crew_id',
  })
  crew: Crew;

  @Column({ name: 'catalog_id', type: 'uuid', nullable: true })
  @RelationId((counter: Counter) => counter.catalog)
  @Index('catalog_id_idx_counter')
  catalogId: string;

  @ManyToOne(() => Catalog, { onDelete: 'RESTRICT' })
  @JoinColumn({
    name: 'catalog_id',
    referencedColumnName: 'id',
    foreignKeyConstraintName: 'fk_counter_catalog_id',
  })
  catalog: Catalog;

  @ManyToOne(() => ExpandedCatalog, { createForeignKeyConstraints: false })
  @Expose({ name: 'catalog' })
  @Type(() => ExpandedCatalog)
  @Transform(({ value }) => (value ? value : null))
  @JoinColumn({
    name: 'catalog_id',
    referencedColumnName: 'id',
  })
  expandedCatalog: ExpandedCatalog;

  @Expose()
  @Column()
  name: string;

  @Expose()
  @Column({ type: 'enum', enum: CounterKind, default: CounterKind.SIMPLE })
  kind: CounterKind;

  @Expose()
  @Column({ type: 'jsonb', default: {} })
  @Type(() => CounterMetadata)
  @Transform(({ value }) => (value ? value : null))
  metadata: CounterMetadata;

  @Expose()
  @Type(() => CounterEntry)
  @Transform(({ value }) => (value ? value : null))
  @OneToMany(() => CounterEntry, (entry) => entry.counter)
  items: CounterEntry[];

  @Expose()
  @Type(() => CounterAccess)
  @Transform(({ value }) => (value ? value : null))
  @OneToMany(() => CounterAccess, (entry) => entry.counter)
  access: CounterAccess[];

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

@ViewEntity({
  name: 'counter_current',
  expression: (ds) =>
    ds
      .createQueryBuilder()
      .addSelect('counter.id', 'id')
      .addSelect('counter.name', 'name')
      .addSelect('counter.kind', 'kind')
      .addSelect('counter.metadata', 'metadata')
      .addSelect('counter.guild_id', 'guild_id')
      .addSelect('counter.catalog_id', 'catalog_id')
      .addSelect('counter.crew_id', 'crew_id')
      .addSelect('counter.war_number', 'war_number')
      .addSelect('counter.created_at', 'created_at')
      .addSelect('counter.created_by_sf', 'created_by_sf')
      .addSelect('entry.id', 'entry_id')
      .addSelect('COALESCE(entry.value, 0)', 'entry_value')
      .addSelect('entry.created_at', 'entry_created_at')
      .addSelect('entry.created_by_sf', 'entry_created_by_sf')
      .from(Counter, 'counter')
      .innerJoin(
        () =>
          ds
            .createQueryBuilder()
            .subQuery()
            .addSelect('war_number')
            .from(War, 'war')
            .addOrderBy('war.war_number', 'DESC')
            .limit(1),
        'war',
        'war.war_number=counter.war_number',
      )
      .leftJoin(
        () =>
          ds
            .createQueryBuilder()
            .subQuery()
            .distinctOn(['entry.counter_id'])
            .select(['entry.*'])
            .from(CounterEntry, 'entry')
            .addOrderBy('entry.counter_id')
            .addOrderBy('entry.created_at', 'DESC'),
        'entry',
        'counter.id=entry.counter_id',
      )
      .addOrderBy('counter.created_at', 'ASC'),
})
export class CurrentCounter {
  @Column({ type: 'uuid' })
  id: string;

  @Column({ name: 'crew_id', type: 'uuid', nullable: true })
  crewId: string;

  @ManyToOne(() => Crew)
  @JoinColumn({
    name: 'crew_id',
    referencedColumnName: 'id',
  })
  crew: Crew;

  @Column({ type: 'uuid', name: 'catalog_id' })
  catalogId: string;

  @ManyToOne(() => ExpandedCatalog)
  catalog: ExpandedCatalog;

  @ManyToOne(() => ExpandedCatalog)
  @Expose({ name: 'catalog' })
  @Type(() => ExpandedCatalog)
  @Transform(({ value }) => (value ? value : null))
  @JoinColumn({
    name: 'catalog_id',
    referencedColumnName: 'id',
  })
  expandedCatalog: ExpandedCatalog;

  @Column({ type: 'int8', name: 'war_number' })
  warNumber: string;

  @ManyToOne(() => War)
  @JoinColumn({
    name: 'war_number',
    referencedColumnName: 'warNumber',
  })
  war: War;

  @Column({ type: 'uuid', name: 'guild_id' })
  guildId: string;

  @ManyToOne(() => Guild)
  @JoinColumn({
    name: 'guild_id',
    referencedColumnName: 'id',
  })
  guild: Guild;

  @Expose()
  @Column()
  name: string;

  @Expose()
  @Column({ type: 'enum', enum: CounterKind, default: CounterKind.RESERVE })
  kind: CounterKind;

  @Expose()
  @Column({ type: 'jsonb', default: {} })
  @Type(() => CounterMetadata)
  @Transform(({ value }) => (value ? value : null))
  metadata: CounterMetadata;

  @Column({ type: 'uuid', name: 'entry_id' })
  lastEntryId: string;

  @Expose()
  @Column({ type: 'int4', name: 'entry_value' })
  value: number;

  @OneToMany(() => CounterAccess, (access) => access.counter)
  @Type(() => CounterAccess)
  @Transform(({ value }) => (value ? value : null))
  access: CounterAccess[];

  @Expose()
  @Column({ type: 'int8', name: 'created_by_sf' })
  createdBy: Snowflake;

  @Expose()
  @Column({ type: 'timestamptz', name: 'created_at' })
  createdAt: Date;

  @Expose()
  @Column({ type: 'int8', name: 'entry_created_by_sf' })
  updatedBy: Snowflake;

  @Expose()
  @Column({ type: 'timestamptz', name: 'entry_created_at' })
  updatedAt: Date;
}
