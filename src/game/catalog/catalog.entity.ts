import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  Unique,
  CreateDateColumn,
  ViewEntity,
  ViewColumn,
} from 'typeorm';
import { WarFaction } from 'src/game/war/war.entity';

@Entity()
@Unique('uk_foxhole_catalog_name', ['gameVersion', 'catalogVersion', 'name'])
export class Catalog {
  @PrimaryGeneratedColumn({ type: 'int8', primaryKeyConstraintName: 'pk_catalog_id' })
  id: string;

  @Column({ name: 'foxhole_version' })
  gameVersion: string;

  @Column({ name: 'catalog_version' })
  catalogVersion: string;

  @Column({ name: 'code_name' })
  name: string;

  @Column({ type: 'text', array: true, default: [] })
  slang: string[];

  @Column('jsonb')
  data: any;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}

@ViewEntity({
  name: 'catalog_expanded',
  expression: (ds) =>
    ds
      .createQueryBuilder()
      .select([
        'id',
        'code_name',
        `(data ->> 'DisplayName')::text display_name`,
        'foxhole_version',
        'catalog_version',
        `(
            CASE
              WHEN data ? 'FactionVariant'
              AND (data ->> 'FactionVariant') = 'EFactionId::Wardens' THEN 'WARDENS'::"${(ds.options as unknown as any).schema}".faction
              WHEN data ? 'FactionVariant'
              AND (data ->> 'FactionVariant') = 'EFactionId::Colonials' THEN 'COLONIALS'::"${(ds.options as unknown as any).schema}".faction
              ELSE 'NONE'::"${(ds.options as unknown as any).schema}".faction
            END
          ) faction`,
        `(
          CASE
            WHEN data ? 'ItemProfileType' THEN (data ->> 'ItemProfileType')::text
            WHEN data ? 'VehicleProfileType' THEN (data ->> 'VehicleProfileType')::text
            WHEN data ? 'ShippableInfo' THEN (data ->> 'ShippableInfo')::text
            WHEN data ->> 'CodeName' IN ('MaterialPlatform') THEN 'EShippableType::Normal'
            ELSE NULL
          END
        ) category`,
        `(
          CASE
            WHEN data ? 'ItemDynamicData' THEN (data #> '{ItemDynamicData,QuantityPerCrate}')::int
            ELSE NULL
          END
        ) crate_quantity`,
        `(
          CASE
            WHEN data ? 'ItemProfileData' THEN (data #> '{ItemProfileData,ReserveStockpileMaxQuantity}')::int
            ELSE NULL
          END
        ) crate_stockpile_maximum`,
        `(
          CASE
            WHEN data ? 'VehiclesPerCrateBonusQuantity'
              AND data ->> 'VehicleBuildType' IN ('EVehicleBuildType::VehicleFactory', 'EVehicleBuildType::Shipyard') THEN 3 + (data -> 'VehiclesPerCrateBonusQuantity')::int
            WHEN (
              data ? 'VehicleDynamicData'
              AND data ->> 'VehicleBuildType' IN ('EVehicleBuildType::VehicleFactory', 'EVehicleBuildType::Shipyard')
            )
            OR (
              data ? 'BuildLocationType'
              AND data ->> 'BuildLocationType' IN ('EBuildLocationType::ConstructionYard')
            )
            OR data ->> 'CodeName' IN (
              'Construction',
              'Crane'
            ) THEN 3
            ELSE NULL
          END
        ) shippable_quantity`,
        `(
          CASE
            WHEN (
              data ? 'VehicleDynamicData'
              AND data ->> 'VehicleBuildType' IN ('EVehicleBuildType::VehicleFactory', 'EVehicleBuildType::Shipyard')
            ) 
            OR (
              data ? 'VehicleProfileType'
              AND data ->> 'VehicleProfileType' IN (
                'EVehicleProfileType::Construction',
                'EVehicleProfileType::FieldWeapon',
                'EVehicleProfileType::Tank',
                'EVehicleProfileType::TrackedTransport',
                'EVehicleProfileType::WheeledArmoured',
                'EVehicleProfileType::WheeledTransport',
                'EVehicleProfileType::Trailer',
                'EVehicleProfileType::OpenRoofWheeledTransport'
              )
              AND (
                NOT data ? 'TechID'
                OR data ->> 'TechID' NOT IN (
                  'ETechID::UnlockBattleTank'
                )
              )
            ) 
            OR (
              data ? 'BuildLocationType'
              AND data ->> 'BuildLocationType' IN ('EBuildLocationType::ConstructionYard')
            ) THEN 10
            ELSE NULL
          END
        ) shippable_stockpile_maximum`,
        'data',
        'created_at',
      ])
      .from(Catalog, 'c'),
})
export class ExpandedCatalog {
  @ViewColumn()
  id: string;

  @ViewColumn({ name: 'foxhole_version' })
  gameVersion: string;

  @ViewColumn({ name: 'catalog_version' })
  catalogVersion: string;

  @ViewColumn({ name: 'code_name' })
  name: string;

  @ViewColumn({ name: 'display_name' })
  displayName: string;

  @ViewColumn()
  faction: WarFaction;

  @ViewColumn({ name: 'category' })
  category: string;

  @ViewColumn({ name: 'crate_quantity' })
  crateQuantity: string;

  @ViewColumn({ name: 'shippable_quantity' })
  shippableQuantity: string;

  @ViewColumn({ name: 'crate_stockpile_maximum' })
  crateMax: string;

  @ViewColumn({ name: 'shippable_stockpile_maximum' })
  shippableMax: string;

  @ViewColumn()
  data: any;

  @ViewColumn({ name: 'created_at' })
  createdAt: Date;
}
