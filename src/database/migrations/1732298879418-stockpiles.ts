import { MigrationInterface, QueryRunner } from 'typeorm';

export class Stockpiles1732298879418 implements MigrationInterface {
  name = 'Stockpiles1732298879418';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('SET session_replication_role = replica');
    await queryRunner.query(
      `DELETE FROM "app"."typeorm_metadata" WHERE "type" = $1 AND "name" = $2 AND "schema" = $3`,
      ['VIEW', 'catalog_expanded', 'app'],
    );
    await queryRunner.query(`DROP VIEW "app"."catalog_expanded"`);
    await queryRunner.query(
      `CREATE TABLE "app"."stockpile_log" ("id" uuid NOT NULL DEFAULT uuidv7(), "crew_channel_sf" bigint, "location_id" bigint NOT NULL, "war_number" bigint NOT NULL, "guild_id" uuid NOT NULL, "message" character varying NOT NULL, "raw" text NOT NULL, "processed_at" TIMESTAMP WITH TIME ZONE, "created_by_sf" bigint NOT NULL, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "deleted_by_sf" bigint, "deleted_at" TIMESTAMP WITH TIME ZONE, CONSTRAINT "pk_stockpile_log_id" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "crew_channel_sf_idx_stockpile_log" ON "app"."stockpile_log" ("crew_channel_sf") `,
    );
    await queryRunner.query(
      `CREATE INDEX "location_id_idx_stockpile_log" ON "app"."stockpile_log" ("location_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "war_number_idx_stockpile_log" ON "app"."stockpile_log" ("war_number") `,
    );
    await queryRunner.query(
      `CREATE INDEX "guild_id_idx_stockpile_log" ON "app"."stockpile_log" ("guild_id") `,
    );
    await queryRunner.query(
      `CREATE TABLE "app"."stockpile_entry" ("id" uuid NOT NULL DEFAULT uuidv7(), "log_id" uuid NOT NULL, "stockpile_id" uuid NOT NULL, "catalog_id" uuid NOT NULL, "war_number" bigint NOT NULL, "guild_id" uuid NOT NULL, "quantity_uncrated" integer NOT NULL DEFAULT '0', "quantity_crated" integer NOT NULL DEFAULT '0', "quantity_shippable" integer NOT NULL DEFAULT '0', "created_by_sf" bigint NOT NULL, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "pk_stockpile_entry_id" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "log_id_idx_stockpile_entry" ON "app"."stockpile_entry" ("log_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "stockpile_id_idx_stockpile_entry" ON "app"."stockpile_entry" ("stockpile_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "catalog_id_idx_stockpile_entry" ON "app"."stockpile_entry" ("catalog_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "war_number_idx_stockpile_entry" ON "app"."stockpile_entry" ("war_number") `,
    );
    await queryRunner.query(
      `CREATE INDEX "guild_id_idx_stockpile_entry" ON "app"."stockpile_entry" ("guild_id") `,
    );
    await queryRunner.query(`CREATE TYPE "app"."access_rule_type_enum" AS ENUM('permit', 'deny')`);
    await queryRunner.query(
      `CREATE TABLE "app"."access_rule" ("id" uuid NOT NULL DEFAULT uuidv7(), "guild_id" uuid NOT NULL, "description" character varying NOT NULL, "type" "app"."access_rule_type_enum" NOT NULL DEFAULT 'permit', "rule" jsonb NOT NULL, "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_by_sf" bigint NOT NULL, "deleted_at" TIMESTAMP WITH TIME ZONE, "deleted_by_sf" bigint, CONSTRAINT "pk_access_rule_id" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "guild_id_idx_access" ON "app"."access_rule" ("guild_id") `,
    );
    await queryRunner.query(
      `CREATE TABLE "app"."stockpile_access" ("id" uuid NOT NULL DEFAULT uuidv7(), "rule_id" uuid NOT NULL, "stockpile_id" uuid NOT NULL, "created_by_sf" bigint NOT NULL, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "deleted_at" TIMESTAMP WITH TIME ZONE, CONSTRAINT "uk_rule_stockpile_deleted_at" UNIQUE NULLS NOT DISTINCT ("rule_id", "stockpile_id", "deleted_at"), CONSTRAINT "pk_stockpile_access_id" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "rule_id_idx_stockpile_access" ON "app"."stockpile_access" ("rule_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "stockpile_id_idx_stockpile_access" ON "app"."stockpile_access" ("stockpile_id") `,
    );
    await queryRunner.query(
      `CREATE TABLE "app"."stockpile" ("id" uuid NOT NULL DEFAULT uuidv7(), "location_id" bigint NOT NULL, "war_number" bigint NOT NULL, "guild_id" uuid NOT NULL, "name" character varying NOT NULL, "code" character varying NOT NULL DEFAULT '000000', "created_by_sf" bigint NOT NULL, "deleted_by_sf" bigint, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "deleted_at" TIMESTAMP WITH TIME ZONE, CONSTRAINT "uk_stockpile_location_name" UNIQUE NULLS NOT DISTINCT ("location_id", "name", "deleted_at"), CONSTRAINT "pk_stockpile_id" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "location_id_idx_stockpile" ON "app"."stockpile" ("location_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "war_number_idx_stockpile" ON "app"."stockpile" ("war_number") `,
    );
    await queryRunner.query(
      `CREATE INDEX "guild_id_idx_stockpile" ON "app"."stockpile" ("guild_id") `,
    );
    await queryRunner.query(
      `ALTER TABLE "app"."stockpile_log" ADD CONSTRAINT "fk_stockpile_log_crew_channel_sf" FOREIGN KEY ("crew_channel_sf") REFERENCES "app"."crew"("crew_channel_sf") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "app"."stockpile_log" ADD CONSTRAINT "fk_stockpile_log_location_id" FOREIGN KEY ("location_id") REFERENCES "app"."poi"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "app"."stockpile_log" ADD CONSTRAINT "fk_stockpile_log_war_number" FOREIGN KEY ("war_number") REFERENCES "app"."war"("war_number") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "app"."stockpile_log" ADD CONSTRAINT "fk_stockpile_log_guild_id" FOREIGN KEY ("guild_id") REFERENCES "app"."guild"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "app"."stockpile_entry" ADD CONSTRAINT "fk_stockpile_entry_stockpile_log_id" FOREIGN KEY ("log_id") REFERENCES "app"."stockpile_log"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "app"."stockpile_entry" ADD CONSTRAINT "fk_stockpile_entry_stockpile_id" FOREIGN KEY ("stockpile_id") REFERENCES "app"."stockpile"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "app"."stockpile_entry" ADD CONSTRAINT "fk_stockpile_entry_catalog_id" FOREIGN KEY ("catalog_id") REFERENCES "app"."catalog"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "app"."stockpile_entry" ADD CONSTRAINT "fk_stockpile_entry_war_number" FOREIGN KEY ("war_number") REFERENCES "app"."war"("war_number") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "app"."stockpile_entry" ADD CONSTRAINT "fk_stockpile_entry_guild_id" FOREIGN KEY ("guild_id") REFERENCES "app"."guild"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "app"."access_rule" ADD CONSTRAINT "fk_access_rule_guild_id" FOREIGN KEY ("guild_id") REFERENCES "app"."guild"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "app"."stockpile_access" ADD CONSTRAINT "fk_stockpile_access_rule_id" FOREIGN KEY ("rule_id") REFERENCES "app"."access_rule"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "app"."stockpile_access" ADD CONSTRAINT "fk_stockpile_entry_stockpile_id" FOREIGN KEY ("stockpile_id") REFERENCES "app"."stockpile"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "app"."stockpile" ADD CONSTRAINT "fk_stockpile_location_id" FOREIGN KEY ("location_id") REFERENCES "app"."poi"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "app"."stockpile" ADD CONSTRAINT "fk_stockpile_war_number" FOREIGN KEY ("war_number") REFERENCES "app"."war"("war_number") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "app"."stockpile" ADD CONSTRAINT "fk_stockpile_guild_id" FOREIGN KEY ("guild_id") REFERENCES "app"."guild"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(`CREATE VIEW "app"."catalog_expanded" AS SELECT id, code_name, slang, (data ->> 'DisplayName')::text display_name, foxhole_version, catalog_version, (
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
        "SELECT id, code_name, slang, (data ->> 'DisplayName')::text display_name, foxhole_version, catalog_version, (\n            CASE\n              WHEN data ? 'FactionVariant'\n              AND (data ->> 'FactionVariant') = 'EFactionId::Wardens' THEN 'WARDENS'::\"app\".faction\n              WHEN data ? 'FactionVariant'\n              AND (data ->> 'FactionVariant') = 'EFactionId::Colonials' THEN 'COLONIALS'::\"app\".faction\n              ELSE 'NONE'::\"app\".faction\n            END\n          ) faction, (\n          CASE\n            WHEN data ? 'ItemProfileType' THEN (data ->> 'ItemProfileType')::text\n            WHEN data ? 'VehicleProfileType' THEN (data ->> 'VehicleProfileType')::text\n            WHEN data ? 'ShippableInfo' THEN (data ->> 'ShippableInfo')::text\n            WHEN data ->> 'CodeName' IN ('MaterialPlatform') THEN 'EShippableType::Normal'\n            ELSE NULL\n          END\n        ) category, (\n          CASE\n            WHEN data ? 'ItemDynamicData' THEN (data #> '{ItemDynamicData,QuantityPerCrate}')::int\n            ELSE NULL\n          END\n        ) crate_quantity, (\n          CASE\n            WHEN data ? 'ItemProfileData' THEN (data #> '{ItemProfileData,ReserveStockpileMaxQuantity}')::int\n            ELSE NULL\n          END\n        ) crate_stockpile_maximum, (\n          CASE\n            WHEN data ? 'VehiclesPerCrateBonusQuantity'\n              AND data ->> 'VehicleBuildType' IN ('EVehicleBuildType::VehicleFactory', 'EVehicleBuildType::Shipyard') THEN 3 + (data -> 'VehiclesPerCrateBonusQuantity')::int\n            WHEN (\n              data ? 'VehicleDynamicData'\n              AND data ->> 'VehicleBuildType' IN ('EVehicleBuildType::VehicleFactory', 'EVehicleBuildType::Shipyard')\n            )\n            OR (\n              data ? 'BuildLocationType'\n              AND data ->> 'BuildLocationType' IN ('EBuildLocationType::ConstructionYard')\n            )\n            OR data ->> 'CodeName' IN (\n              'Construction',\n              'Crane'\n            ) THEN 3\n            ELSE NULL\n          END\n        ) shippable_quantity, (\n          CASE\n            WHEN (\n              data ? 'VehicleDynamicData'\n              AND data ->> 'VehicleBuildType' IN ('EVehicleBuildType::VehicleFactory', 'EVehicleBuildType::Shipyard')\n            ) \n            OR (\n              data ? 'VehicleProfileType'\n              AND data ->> 'VehicleProfileType' IN (\n                'EVehicleProfileType::Construction',\n                'EVehicleProfileType::FieldWeapon',\n                'EVehicleProfileType::Tank',\n                'EVehicleProfileType::TrackedTransport',\n                'EVehicleProfileType::WheeledArmoured',\n                'EVehicleProfileType::WheeledTransport',\n                'EVehicleProfileType::Trailer',\n                'EVehicleProfileType::OpenRoofWheeledTransport'\n              )\n              AND (\n                NOT data ? 'TechID'\n                OR data ->> 'TechID' NOT IN (\n                  'ETechID::UnlockBattleTank'\n                )\n              )\n            ) \n            OR (\n              data ? 'BuildLocationType'\n              AND data ->> 'BuildLocationType' IN ('EBuildLocationType::ConstructionYard')\n            ) THEN 10\n            ELSE NULL\n          END\n        ) shippable_stockpile_maximum, data, created_at FROM \"app\".\"catalog\" \"c\"",
      ],
    );
    await queryRunner.query(
      `CREATE VIEW "app"."stockpile_entry_current" AS SELECT DISTINCT ON ("entry"."stockpile_id", "entry"."catalog_id") "l"."id" AS "l_id", "l"."crew_channel_sf" AS "l_crew_channel_sf", "l"."location_id" AS "l_location_id", "l"."war_number" AS "l_war_number", "l"."guild_id" AS "l_guild_id", "l"."message" AS "l_message", "l"."raw" AS "l_raw", "l"."processed_at" AS "l_processed_at", "l"."created_by_sf" AS "l_created_by_sf", "l"."created_at" AS "l_created_at", "l"."deleted_by_sf" AS "l_deleted_by_sf", "l"."deleted_at" AS "l_deleted_at", "c"."id" AS "c_id", "c"."foxhole_version" AS "c_foxhole_version", "c"."catalog_version" AS "c_catalog_version", "c"."code_name" AS "c_code_name", "c"."slang" AS "c_slang", "c"."display_name" AS "c_display_name", "c"."faction" AS "c_faction", "c"."category" AS "c_category", "c"."crate_quantity" AS "c_crate_quantity", "c"."shippable_quantity" AS "c_shippable_quantity", "c"."crate_stockpile_maximum" AS "c_crate_stockpile_maximum", "c"."shippable_stockpile_maximum" AS "c_shippable_stockpile_maximum", "c"."data" AS "c_data", "c"."created_at" AS "c_created_at", entry.* FROM "app"."stockpile_entry" "entry" LEFT JOIN "app"."stockpile_log" "l" ON "l"."id"="entry"."log_id"  LEFT JOIN "app"."catalog_expanded" "c" ON "c"."id"="entry"."catalog_id" WHERE "l"."deleted_at" IS NULL ORDER BY "entry"."stockpile_id" ASC, "entry"."catalog_id" ASC, "entry"."created_at" DESC`,
    );
    await queryRunner.query(
      `INSERT INTO "app"."typeorm_metadata"("database", "schema", "table", "type", "name", "value") VALUES (DEFAULT, $1, DEFAULT, $2, $3, $4)`,
      [
        'app',
        'VIEW',
        'stockpile_entry_current',
        'SELECT DISTINCT ON ("entry"."stockpile_id", "entry"."catalog_id") "l"."id" AS "l_id", "l"."crew_channel_sf" AS "l_crew_channel_sf", "l"."location_id" AS "l_location_id", "l"."war_number" AS "l_war_number", "l"."guild_id" AS "l_guild_id", "l"."message" AS "l_message", "l"."raw" AS "l_raw", "l"."processed_at" AS "l_processed_at", "l"."created_by_sf" AS "l_created_by_sf", "l"."created_at" AS "l_created_at", "l"."deleted_by_sf" AS "l_deleted_by_sf", "l"."deleted_at" AS "l_deleted_at", "c"."id" AS "c_id", "c"."foxhole_version" AS "c_foxhole_version", "c"."catalog_version" AS "c_catalog_version", "c"."code_name" AS "c_code_name", "c"."slang" AS "c_slang", "c"."display_name" AS "c_display_name", "c"."faction" AS "c_faction", "c"."category" AS "c_category", "c"."crate_quantity" AS "c_crate_quantity", "c"."shippable_quantity" AS "c_shippable_quantity", "c"."crate_stockpile_maximum" AS "c_crate_stockpile_maximum", "c"."shippable_stockpile_maximum" AS "c_shippable_stockpile_maximum", "c"."data" AS "c_data", "c"."created_at" AS "c_created_at", entry.* FROM "app"."stockpile_entry" "entry" LEFT JOIN "app"."stockpile_log" "l" ON "l"."id"="entry"."log_id"  LEFT JOIN "app"."catalog_expanded" "c" ON "c"."id"="entry"."catalog_id" WHERE "l"."deleted_at" IS NULL ORDER BY "entry"."stockpile_id" ASC, "entry"."catalog_id" ASC, "entry"."created_at" DESC',
      ],
    );
    await queryRunner.query(
      `CREATE VIEW "app"."poi_expanded" AS SELECT "p"."id" id, "r"."hex_id" hex_id, "p"."region_id" region_id, "p"."war_number" war_number, "p"."x" x, "p"."y" y, "p"."marker_type" marker_type, "r"."x" rx, "r"."y" ry, "r"."hex_name" hex_name, "r"."major_name" major_name, "r"."minor_name" minor_name, "r"."slang" slang, "p"."deleted_at" deleted_at FROM "app"."poi" "p" INNER JOIN "app"."region" "r" ON "r"."id"="p"."region_id" AND ("r"."deleted_at" IS NULL) WHERE "p"."deleted_at" IS NULL`,
    );
    await queryRunner.query(
      `INSERT INTO "app"."typeorm_metadata"("database", "schema", "table", "type", "name", "value") VALUES (DEFAULT, $1, DEFAULT, $2, $3, $4)`,
      [
        'app',
        'VIEW',
        'poi_expanded',
        'SELECT "p"."id" id, "r"."hex_id" hex_id, "p"."region_id" region_id, "p"."war_number" war_number, "p"."x" x, "p"."y" y, "p"."marker_type" marker_type, "r"."x" rx, "r"."y" ry, "r"."hex_name" hex_name, "r"."major_name" major_name, "r"."minor_name" minor_name, "r"."slang" slang, "p"."deleted_at" deleted_at FROM "app"."poi" "p" INNER JOIN "app"."region" "r" ON "r"."id"="p"."region_id" AND ("r"."deleted_at" IS NULL) WHERE "p"."deleted_at" IS NULL',
      ],
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('SET session_replication_role = replica');
    await queryRunner.query(
      `DELETE FROM "app"."typeorm_metadata" WHERE "type" = $1 AND "name" = $2 AND "schema" = $3`,
      ['VIEW', 'poi_expanded', 'app'],
    );
    await queryRunner.query(`DROP VIEW "app"."poi_expanded"`);
    await queryRunner.query(
      `DELETE FROM "app"."typeorm_metadata" WHERE "type" = $1 AND "name" = $2 AND "schema" = $3`,
      ['VIEW', 'stockpile_entry_current', 'app'],
    );
    await queryRunner.query(`DROP VIEW "app"."stockpile_entry_current"`);
    await queryRunner.query(
      `DELETE FROM "app"."typeorm_metadata" WHERE "type" = $1 AND "name" = $2 AND "schema" = $3`,
      ['VIEW', 'catalog_expanded', 'app'],
    );
    await queryRunner.query(`DROP VIEW "app"."catalog_expanded"`);
    await queryRunner.query(
      `ALTER TABLE "app"."stockpile" DROP CONSTRAINT "fk_stockpile_guild_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "app"."stockpile" DROP CONSTRAINT "fk_stockpile_war_number"`,
    );
    await queryRunner.query(
      `ALTER TABLE "app"."stockpile" DROP CONSTRAINT "fk_stockpile_location_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "app"."stockpile_access" DROP CONSTRAINT "fk_stockpile_entry_stockpile_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "app"."stockpile_access" DROP CONSTRAINT "fk_stockpile_access_rule_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "app"."access_rule" DROP CONSTRAINT "fk_access_rule_guild_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "app"."stockpile_entry" DROP CONSTRAINT "fk_stockpile_entry_guild_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "app"."stockpile_entry" DROP CONSTRAINT "fk_stockpile_entry_war_number"`,
    );
    await queryRunner.query(
      `ALTER TABLE "app"."stockpile_entry" DROP CONSTRAINT "fk_stockpile_entry_catalog_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "app"."stockpile_entry" DROP CONSTRAINT "fk_stockpile_entry_stockpile_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "app"."stockpile_entry" DROP CONSTRAINT "fk_stockpile_entry_stockpile_log_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "app"."stockpile_log" DROP CONSTRAINT "fk_stockpile_log_guild_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "app"."stockpile_log" DROP CONSTRAINT "fk_stockpile_log_war_number"`,
    );
    await queryRunner.query(
      `ALTER TABLE "app"."stockpile_log" DROP CONSTRAINT "fk_stockpile_log_location_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "app"."stockpile_log" DROP CONSTRAINT "fk_stockpile_log_crew_channel_sf"`,
    );
    await queryRunner.query(`DROP INDEX "app"."guild_id_idx_stockpile"`);
    await queryRunner.query(`DROP INDEX "app"."war_number_idx_stockpile"`);
    await queryRunner.query(`DROP INDEX "app"."location_id_idx_stockpile"`);
    await queryRunner.query(`DROP TABLE "app"."stockpile"`);
    await queryRunner.query(`DROP INDEX "app"."stockpile_id_idx_stockpile_access"`);
    await queryRunner.query(`DROP INDEX "app"."rule_id_idx_stockpile_access"`);
    await queryRunner.query(`DROP TABLE "app"."stockpile_access"`);
    await queryRunner.query(`DROP INDEX "app"."guild_id_idx_access"`);
    await queryRunner.query(`DROP TABLE "app"."access_rule"`);
    await queryRunner.query(`DROP TYPE "app"."access_rule_type_enum"`);
    await queryRunner.query(`DROP INDEX "app"."guild_id_idx_stockpile_entry"`);
    await queryRunner.query(`DROP INDEX "app"."war_number_idx_stockpile_entry"`);
    await queryRunner.query(`DROP INDEX "app"."catalog_id_idx_stockpile_entry"`);
    await queryRunner.query(`DROP INDEX "app"."stockpile_id_idx_stockpile_entry"`);
    await queryRunner.query(`DROP INDEX "app"."log_id_idx_stockpile_entry"`);
    await queryRunner.query(`DROP TABLE "app"."stockpile_entry"`);
    await queryRunner.query(`DROP INDEX "app"."guild_id_idx_stockpile_log"`);
    await queryRunner.query(`DROP INDEX "app"."war_number_idx_stockpile_log"`);
    await queryRunner.query(`DROP INDEX "app"."location_id_idx_stockpile_log"`);
    await queryRunner.query(`DROP INDEX "app"."crew_channel_sf_idx_stockpile_log"`);
    await queryRunner.query(`DROP TABLE "app"."stockpile_log"`);
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
}
