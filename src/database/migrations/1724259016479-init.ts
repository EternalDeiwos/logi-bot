import { MigrationInterface, QueryRunner } from 'typeorm';

export class Init1724259016479 implements MigrationInterface {
  name = 'Init1724259016479';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE TYPE "app"."faction" AS ENUM('WARDENS', 'COLONIALS', 'NONE')`);
    await queryRunner.query(
      `CREATE TABLE "app"."war" ("war_number" bigint NOT NULL, "winner" "app"."faction" NOT NULL DEFAULT 'NONE', "clapfoot_id" character varying NOT NULL, "started_at" TIMESTAMP WITH TIME ZONE NOT NULL, "ended_at" TIMESTAMP WITH TIME ZONE, CONSTRAINT "uk_clapfoot_id_war" UNIQUE ("clapfoot_id"), CONSTRAINT "pk_war_number" PRIMARY KEY ("war_number"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "app"."region" ("id" BIGSERIAL NOT NULL, "hex_id" bigint NOT NULL, "map_name" character varying NOT NULL, "hex_name" character varying NOT NULL, "major_name" character varying, "minor_name" character varying, "slang" text array NOT NULL DEFAULT '{}', "x" double precision NOT NULL, "y" double precision NOT NULL, "deleted_at" TIMESTAMP WITH TIME ZONE, CONSTRAINT "uk_hex_major_minor_deleted_at" UNIQUE NULLS NOT DISTINCT ("hex_id", "major_name", "minor_name", "deleted_at"), CONSTRAINT "pk_region_id" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(`CREATE INDEX "hex_idx_region" ON "app"."region" ("hex_id") `);
    await queryRunner.query(
      `CREATE TABLE "app"."region_log" ("id" BIGSERIAL NOT NULL, "hex_id" bigint NOT NULL, "version" bigint NOT NULL, "war_number" bigint NOT NULL, "data" jsonb NOT NULL, "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL, CONSTRAINT "pk_region_log_id" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(`CREATE INDEX "hex_idx_region_log" ON "app"."region_log" ("hex_id") `);
    await queryRunner.query(
      `CREATE INDEX "war_number_idx_region_log" ON "app"."region_log" ("war_number") `,
    );
    await queryRunner.query(
      `CREATE INDEX "updated_at_idx_region_log" ON "app"."region_log" ("updated_at") `,
    );
    await queryRunner.query(
      `CREATE TABLE "app"."poi" ("id" BIGSERIAL NOT NULL, "region_id" bigint NOT NULL, "war_number" bigint NOT NULL, "marker_type" integer NOT NULL, "x" double precision NOT NULL, "y" double precision NOT NULL, "deleted_at" TIMESTAMP WITH TIME ZONE, CONSTRAINT "pk_poi_id" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(`CREATE INDEX "region_idx_poi" ON "app"."poi" ("region_id") `);
    await queryRunner.query(`CREATE INDEX "war_number_idx_poi" ON "app"."poi" ("war_number") `);
    await queryRunner.query(`CREATE INDEX "marker_type_idx_poi" ON "app"."poi" ("marker_type") `);
    await queryRunner.query(
      `CREATE TABLE "app"."catalog" ("id" BIGSERIAL NOT NULL, "foxhole_version" character varying NOT NULL, "catalog_version" character varying NOT NULL, "code_name" character varying NOT NULL, "slang" text array NOT NULL DEFAULT '{}', "data" jsonb NOT NULL, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "uk_foxhole_catalog_name" UNIQUE ("foxhole_version", "catalog_version", "code_name"), CONSTRAINT "pk_catalog_id" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "app"."guild" ("id" BIGSERIAL NOT NULL, "guild_sf" bigint NOT NULL, "name" character varying NOT NULL, "short_name" character varying NOT NULL, "icon" character varying, "config" jsonb NOT NULL DEFAULT '{}', "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "deleted_at" TIMESTAMP WITH TIME ZONE, CONSTRAINT "uk_guild_sf_deleted_at" UNIQUE NULLS NOT DISTINCT ("guild_sf", "deleted_at"), CONSTRAINT "pk_guild_id" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "app"."stockpile" ("id" BIGSERIAL NOT NULL, "guild_id" bigint NOT NULL, "poi_id" bigint NOT NULL, "war_number" bigint NOT NULL, "name" character varying NOT NULL, "code" character varying NOT NULL DEFAULT '000000', "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "deleted_at" TIMESTAMP WITH TIME ZONE, CONSTRAINT "uk_poi_war_name" UNIQUE ("poi_id", "war_number", "name"), CONSTRAINT "pk_stockpile_id" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "guild_id_idx_stockpile" ON "app"."stockpile" ("guild_id") `,
    );
    await queryRunner.query(`CREATE INDEX "poi_id_idx_stockpile" ON "app"."stockpile" ("poi_id") `);
    await queryRunner.query(
      `CREATE INDEX "war_number_idx_stockpile" ON "app"."stockpile" ("war_number") `,
    );
    await queryRunner.query(`CREATE INDEX "name_idx_stockpile" ON "app"."stockpile" ("name") `);
    await queryRunner.query(
      `CREATE TABLE "app"."stockpile_log" ("id" BIGSERIAL NOT NULL, "guild_id" bigint NOT NULL, "war_number" bigint NOT NULL, "stockpile_id" bigint NOT NULL, "description" character varying NOT NULL, "screenshot_path" character varying, "created_by_sf" bigint NOT NULL, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "pk_stockpile_log_id" PRIMARY KEY ("id")); COMMENT ON COLUMN "app"."stockpile_log"."description" IS 'A player-provided message describing the change in a stockpile'`,
    );
    await queryRunner.query(
      `CREATE INDEX "guild_id_idx_stockpile_log" ON "app"."stockpile_log" ("guild_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "war_number_idx_stockpile_log" ON "app"."stockpile_log" ("war_number") `,
    );
    await queryRunner.query(
      `CREATE INDEX "stockpile_id_idx_stockpile_log" ON "app"."stockpile_log" ("stockpile_id") `,
    );
    await queryRunner.query(
      `CREATE TABLE "app"."stockpile_entry" ("id" BIGSERIAL NOT NULL, "guild_id" bigint NOT NULL, "war_number" bigint NOT NULL, "log_id" bigint NOT NULL, "catalog_id" bigint NOT NULL, "quantity_loose" integer NOT NULL DEFAULT '0', "quantity_crates" integer NOT NULL DEFAULT '0', "quantity_shippable" integer NOT NULL DEFAULT '0', "created_by_sf" bigint NOT NULL, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "pk_stockpile_entry_id" PRIMARY KEY ("id")); COMMENT ON COLUMN "app"."stockpile_entry"."quantity_loose" IS 'The loose number of items submitted to facility buildings or bunker bases'; COMMENT ON COLUMN "app"."stockpile_entry"."quantity_crates" IS 'The number of crated supply items in a stockpile submitted to storage depots, seaports, or large ships'; COMMENT ON COLUMN "app"."stockpile_entry"."quantity_shippable" IS 'The number of shippable crates in a stockpile submitted to facility buildings or bunker bases'`,
    );
    await queryRunner.query(
      `CREATE INDEX "guild_id_idx_stockpile_entry" ON "app"."stockpile_entry" ("guild_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "war_number_idx_stockpile_entry" ON "app"."stockpile_entry" ("war_number") `,
    );
    await queryRunner.query(
      `CREATE INDEX "log_id_idx_stockpile_entry" ON "app"."stockpile_entry" ("log_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "catalog_id_idx_stockpile_entry" ON "app"."stockpile_entry" ("catalog_id") `,
    );
    await queryRunner.query(
      `ALTER TABLE "app"."region_log" ADD CONSTRAINT "fk_region_log_war_number" FOREIGN KEY ("war_number") REFERENCES "app"."war"("war_number") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "app"."poi" ADD CONSTRAINT "fk_poi_region_id" FOREIGN KEY ("region_id") REFERENCES "app"."region"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "app"."poi" ADD CONSTRAINT "fk_poi_war_number" FOREIGN KEY ("war_number") REFERENCES "app"."war"("war_number") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "app"."stockpile" ADD CONSTRAINT "fk_stockpile_guild_id" FOREIGN KEY ("guild_id") REFERENCES "app"."guild"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "app"."stockpile" ADD CONSTRAINT "fk_stockpile_poi_id" FOREIGN KEY ("poi_id") REFERENCES "app"."poi"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "app"."stockpile" ADD CONSTRAINT "fk_stockpile_war_number" FOREIGN KEY ("war_number") REFERENCES "app"."war"("war_number") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "app"."stockpile_log" ADD CONSTRAINT "fk_stockpile_log_guild_id" FOREIGN KEY ("guild_id") REFERENCES "app"."guild"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "app"."stockpile_log" ADD CONSTRAINT "fk_stockpile_log_war_number" FOREIGN KEY ("war_number") REFERENCES "app"."war"("war_number") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "app"."stockpile_log" ADD CONSTRAINT "fk_stockpile_log_stockpile_id" FOREIGN KEY ("stockpile_id") REFERENCES "app"."stockpile"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "app"."stockpile_entry" ADD CONSTRAINT "fk_stockpile_entry_guild_id" FOREIGN KEY ("guild_id") REFERENCES "app"."guild"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "app"."stockpile_entry" ADD CONSTRAINT "fk_stockpile_entry_war_number" FOREIGN KEY ("war_number") REFERENCES "app"."war"("war_number") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "app"."stockpile_entry" ADD CONSTRAINT "fk_stockpile_entry_stockpile_log_id" FOREIGN KEY ("log_id") REFERENCES "app"."stockpile_log"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "app"."stockpile_entry" ADD CONSTRAINT "fk_stockpile_entry_catalog_id" FOREIGN KEY ("catalog_id") REFERENCES "app"."catalog"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `CREATE VIEW "app"."region_current" AS SELECT * FROM "app"."region" "region" WHERE ( deleted_at IS NULL ) AND ( "region"."deleted_at" IS NULL )`,
    );
    await queryRunner.query(
      `INSERT INTO "app"."typeorm_metadata"("database", "schema", "table", "type", "name", "value") VALUES (DEFAULT, $1, DEFAULT, $2, $3, $4)`,
      [
        'app',
        'VIEW',
        'region_current',
        'SELECT * FROM "app"."region" "region" WHERE ( deleted_at IS NULL ) AND ( "region"."deleted_at" IS NULL )',
      ],
    );
    await queryRunner.query(
      `CREATE VIEW "app"."region_log_current" AS SELECT DISTINCT ON (hex_id) * FROM "app"."region_log" "log" ORDER BY hex_id ASC, updated_at DESC`,
    );
    await queryRunner.query(
      `INSERT INTO "app"."typeorm_metadata"("database", "schema", "table", "type", "name", "value") VALUES (DEFAULT, $1, DEFAULT, $2, $3, $4)`,
      [
        'app',
        'VIEW',
        'region_log_current',
        'SELECT DISTINCT ON (hex_id) * FROM "app"."region_log" "log" ORDER BY hex_id ASC, updated_at DESC',
      ],
    );
    await queryRunner.query(
      `CREATE VIEW "app"."poi_current" AS SELECT "p"."id" id, "r"."hex_id" hex_id, "p"."region_id" region_id, "p"."war_number" war_number, "p"."x" x, "p"."y" y, "p"."marker_type" marker_type, "r"."x" rx, "r"."y" ry, "r"."hex_name" hex_name, "r"."major_name" major_name, "r"."minor_name" minor_name, "r"."slang" slang FROM "app"."poi" "p" INNER JOIN "app"."region" "r" ON  "r"."id"="p"."region_id" AND "r"."deleted_at" IS NULL WHERE ( "p"."deleted_at" IS NULL ) AND ( "p"."deleted_at" IS NULL )`,
    );
    await queryRunner.query(
      `INSERT INTO "app"."typeorm_metadata"("database", "schema", "table", "type", "name", "value") VALUES (DEFAULT, $1, DEFAULT, $2, $3, $4)`,
      [
        'app',
        'VIEW',
        'poi_current',
        'SELECT "p"."id" id, "r"."hex_id" hex_id, "p"."region_id" region_id, "p"."war_number" war_number, "p"."x" x, "p"."y" y, "p"."marker_type" marker_type, "r"."x" rx, "r"."y" ry, "r"."hex_name" hex_name, "r"."major_name" major_name, "r"."minor_name" minor_name, "r"."slang" slang FROM "app"."poi" "p" INNER JOIN "app"."region" "r" ON  "r"."id"="p"."region_id" AND "r"."deleted_at" IS NULL WHERE ( "p"."deleted_at" IS NULL ) AND ( "p"."deleted_at" IS NULL )',
      ],
    );
    await queryRunner.query(`CREATE VIEW "app"."catalog_expanded" AS SELECT id, code_name, (data ->> 'DisplayName')::text display_name, foxhole_version, catalog_version, (
            CASE
              WHEN data ? 'FactionVariant'
              AND (data ->> 'FactionVariant') = 'EFactionId::Wardens' THEN 'WARDENS'::"app".faction
              WHEN data ? 'FactionVariant'
              AND (data ->> 'FactionVariant') = 'EFactionId::Colonials' THEN 'COLONIALS'::"app".faction
              ELSE 'NONE'::"app".faction
            END
          ) faction, (
          CASE
            WHEN data ? 'ItemProfileType' THEN (data ->> 'ItemProfileType')::text
            WHEN data ? 'VehicleProfileType' THEN (data ->> 'VehicleProfileType')::text
            WHEN data ? 'ShippableInfo' THEN (data ->> 'ShippableInfo')::text
            WHEN data ->> 'CodeName' IN ('MaterialPlatform') THEN 'EShippableType::Normal'
            ELSE NULL
          END
        ) category, (
          CASE
            WHEN data ? 'ItemDynamicData' THEN (data #> '{ItemDynamicData,QuantityPerCrate}')::int
            ELSE NULL
          END
        ) crate_quantity, (
          CASE
            WHEN data ? 'ItemProfileData' THEN (data #> '{ItemProfileData,ReserveStockpileMaxQuantity}')::int
            ELSE NULL
          END
        ) crate_stockpile_maximum, (
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
        ) shippable_quantity, (
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
        ) shippable_stockpile_maximum, data, created_at FROM "app"."catalog" "c"`);
    await queryRunner.query(
      `INSERT INTO "app"."typeorm_metadata"("database", "schema", "table", "type", "name", "value") VALUES (DEFAULT, $1, DEFAULT, $2, $3, $4)`,
      [
        'app',
        'VIEW',
        'catalog_expanded',
        "SELECT id, code_name, (data ->> 'DisplayName')::text display_name, foxhole_version, catalog_version, (\n            CASE\n              WHEN data ? 'FactionVariant'\n              AND (data ->> 'FactionVariant') = 'EFactionId::Wardens' THEN 'WARDENS'::\"app\".faction\n              WHEN data ? 'FactionVariant'\n              AND (data ->> 'FactionVariant') = 'EFactionId::Colonials' THEN 'COLONIALS'::\"app\".faction\n              ELSE 'NONE'::\"app\".faction\n            END\n          ) faction, (\n          CASE\n            WHEN data ? 'ItemProfileType' THEN (data ->> 'ItemProfileType')::text\n            WHEN data ? 'VehicleProfileType' THEN (data ->> 'VehicleProfileType')::text\n            WHEN data ? 'ShippableInfo' THEN (data ->> 'ShippableInfo')::text\n            WHEN data ->> 'CodeName' IN ('MaterialPlatform') THEN 'EShippableType::Normal'\n            ELSE NULL\n          END\n        ) category, (\n          CASE\n            WHEN data ? 'ItemDynamicData' THEN (data #> '{ItemDynamicData,QuantityPerCrate}')::int\n            ELSE NULL\n          END\n        ) crate_quantity, (\n          CASE\n            WHEN data ? 'ItemProfileData' THEN (data #> '{ItemProfileData,ReserveStockpileMaxQuantity}')::int\n            ELSE NULL\n          END\n        ) crate_stockpile_maximum, (\n          CASE\n            WHEN data ? 'VehiclesPerCrateBonusQuantity'\n              AND data ->> 'VehicleBuildType' IN ('EVehicleBuildType::VehicleFactory', 'EVehicleBuildType::Shipyard') THEN 3 + (data -> 'VehiclesPerCrateBonusQuantity')::int\n            WHEN (\n              data ? 'VehicleDynamicData'\n              AND data ->> 'VehicleBuildType' IN ('EVehicleBuildType::VehicleFactory', 'EVehicleBuildType::Shipyard')\n            )\n            OR (\n              data ? 'BuildLocationType'\n              AND data ->> 'BuildLocationType' IN ('EBuildLocationType::ConstructionYard')\n            )\n            OR data ->> 'CodeName' IN (\n              'Construction',\n              'Crane'\n            ) THEN 3\n            ELSE NULL\n          END\n        ) shippable_quantity, (\n          CASE\n            WHEN (\n              data ? 'VehicleDynamicData'\n              AND data ->> 'VehicleBuildType' IN ('EVehicleBuildType::VehicleFactory', 'EVehicleBuildType::Shipyard')\n            ) \n            OR (\n              data ? 'VehicleProfileType'\n              AND data ->> 'VehicleProfileType' IN (\n                'EVehicleProfileType::Construction',\n                'EVehicleProfileType::FieldWeapon',\n                'EVehicleProfileType::Tank',\n                'EVehicleProfileType::TrackedTransport',\n                'EVehicleProfileType::WheeledArmoured',\n                'EVehicleProfileType::WheeledTransport',\n                'EVehicleProfileType::Trailer',\n                'EVehicleProfileType::OpenRoofWheeledTransport'\n              )\n              AND (\n                NOT data ? 'TechID'\n                OR data ->> 'TechID' NOT IN (\n                  'ETechID::UnlockBattleTank'\n                )\n              )\n            ) \n            OR (\n              data ? 'BuildLocationType'\n              AND data ->> 'BuildLocationType' IN ('EBuildLocationType::ConstructionYard')\n            ) THEN 10\n            ELSE NULL\n          END\n        ) shippable_stockpile_maximum, data, created_at FROM \"app\".\"catalog\" \"c\"",
      ],
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DELETE FROM "app"."typeorm_metadata" WHERE "type" = $1 AND "name" = $2 AND "schema" = $3`,
      ['VIEW', 'catalog_expanded', 'app'],
    );
    await queryRunner.query(`DROP VIEW "app"."catalog_expanded"`);
    await queryRunner.query(
      `DELETE FROM "app"."typeorm_metadata" WHERE "type" = $1 AND "name" = $2 AND "schema" = $3`,
      ['VIEW', 'poi_current', 'app'],
    );
    await queryRunner.query(`DROP VIEW "app"."poi_current"`);
    await queryRunner.query(
      `DELETE FROM "app"."typeorm_metadata" WHERE "type" = $1 AND "name" = $2 AND "schema" = $3`,
      ['VIEW', 'region_log_current', 'app'],
    );
    await queryRunner.query(`DROP VIEW "app"."region_log_current"`);
    await queryRunner.query(
      `DELETE FROM "app"."typeorm_metadata" WHERE "type" = $1 AND "name" = $2 AND "schema" = $3`,
      ['VIEW', 'region_current', 'app'],
    );
    await queryRunner.query(`DROP VIEW "app"."region_current"`);
    await queryRunner.query(
      `ALTER TABLE "app"."stockpile_entry" DROP CONSTRAINT "fk_stockpile_entry_catalog_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "app"."stockpile_entry" DROP CONSTRAINT "fk_stockpile_entry_stockpile_log_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "app"."stockpile_entry" DROP CONSTRAINT "fk_stockpile_entry_war_number"`,
    );
    await queryRunner.query(
      `ALTER TABLE "app"."stockpile_entry" DROP CONSTRAINT "fk_stockpile_entry_guild_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "app"."stockpile_log" DROP CONSTRAINT "fk_stockpile_log_stockpile_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "app"."stockpile_log" DROP CONSTRAINT "fk_stockpile_log_war_number"`,
    );
    await queryRunner.query(
      `ALTER TABLE "app"."stockpile_log" DROP CONSTRAINT "fk_stockpile_log_guild_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "app"."stockpile" DROP CONSTRAINT "fk_stockpile_war_number"`,
    );
    await queryRunner.query(`ALTER TABLE "app"."stockpile" DROP CONSTRAINT "fk_stockpile_poi_id"`);
    await queryRunner.query(
      `ALTER TABLE "app"."stockpile" DROP CONSTRAINT "fk_stockpile_guild_id"`,
    );
    await queryRunner.query(`ALTER TABLE "app"."poi" DROP CONSTRAINT "fk_poi_war_number"`);
    await queryRunner.query(`ALTER TABLE "app"."poi" DROP CONSTRAINT "fk_poi_region_id"`);
    await queryRunner.query(
      `ALTER TABLE "app"."region_log" DROP CONSTRAINT "fk_region_log_war_number"`,
    );
    await queryRunner.query(`DROP INDEX "app"."catalog_id_idx_stockpile_entry"`);
    await queryRunner.query(`DROP INDEX "app"."log_id_idx_stockpile_entry"`);
    await queryRunner.query(`DROP INDEX "app"."war_number_idx_stockpile_entry"`);
    await queryRunner.query(`DROP INDEX "app"."guild_id_idx_stockpile_entry"`);
    await queryRunner.query(`DROP TABLE "app"."stockpile_entry"`);
    await queryRunner.query(`DROP INDEX "app"."stockpile_id_idx_stockpile_log"`);
    await queryRunner.query(`DROP INDEX "app"."war_number_idx_stockpile_log"`);
    await queryRunner.query(`DROP INDEX "app"."guild_id_idx_stockpile_log"`);
    await queryRunner.query(`DROP TABLE "app"."stockpile_log"`);
    await queryRunner.query(`DROP INDEX "app"."name_idx_stockpile"`);
    await queryRunner.query(`DROP INDEX "app"."war_number_idx_stockpile"`);
    await queryRunner.query(`DROP INDEX "app"."poi_id_idx_stockpile"`);
    await queryRunner.query(`DROP INDEX "app"."guild_id_idx_stockpile"`);
    await queryRunner.query(`DROP TABLE "app"."stockpile"`);
    await queryRunner.query(`DROP TABLE "app"."guild"`);
    await queryRunner.query(`DROP TABLE "app"."catalog"`);
    await queryRunner.query(`DROP INDEX "app"."marker_type_idx_poi"`);
    await queryRunner.query(`DROP INDEX "app"."war_number_idx_poi"`);
    await queryRunner.query(`DROP INDEX "app"."region_idx_poi"`);
    await queryRunner.query(`DROP TABLE "app"."poi"`);
    await queryRunner.query(`DROP INDEX "app"."updated_at_idx_region_log"`);
    await queryRunner.query(`DROP INDEX "app"."war_number_idx_region_log"`);
    await queryRunner.query(`DROP INDEX "app"."hex_idx_region_log"`);
    await queryRunner.query(`DROP TABLE "app"."region_log"`);
    await queryRunner.query(`DROP INDEX "app"."hex_idx_region"`);
    await queryRunner.query(`DROP TABLE "app"."region"`);
    await queryRunner.query(`DROP TABLE "app"."war"`);
    await queryRunner.query(`DROP TYPE "app"."faction"`);
  }
}
