import { MigrationInterface, QueryRunner } from "typeorm";

export class GameViews1726315986907 implements MigrationInterface {
    name = 'GameViews1726315986907'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE VIEW "app"."region_current" AS SELECT * FROM "app"."region" "region" WHERE ( deleted_at IS NULL ) AND ( "region"."deleted_at" IS NULL )`);
        await queryRunner.query(`INSERT INTO "app"."typeorm_metadata"("database", "schema", "table", "type", "name", "value") VALUES (DEFAULT, $1, DEFAULT, $2, $3, $4)`, ["app","VIEW","region_current","SELECT * FROM \"app\".\"region\" \"region\" WHERE ( deleted_at IS NULL ) AND ( \"region\".\"deleted_at\" IS NULL )"]);
        await queryRunner.query(`CREATE VIEW "app"."region_log_current" AS SELECT DISTINCT ON (hex_id) * FROM "app"."region_log" "log" ORDER BY hex_id ASC, updated_at DESC`);
        await queryRunner.query(`INSERT INTO "app"."typeorm_metadata"("database", "schema", "table", "type", "name", "value") VALUES (DEFAULT, $1, DEFAULT, $2, $3, $4)`, ["app","VIEW","region_log_current","SELECT DISTINCT ON (hex_id) * FROM \"app\".\"region_log\" \"log\" ORDER BY hex_id ASC, updated_at DESC"]);
        await queryRunner.query(`CREATE VIEW "app"."poi_current" AS SELECT "p"."id" id, "r"."hex_id" hex_id, "p"."region_id" region_id, "p"."war_number" war_number, "p"."x" x, "p"."y" y, "p"."marker_type" marker_type, "r"."x" rx, "r"."y" ry, "r"."hex_name" hex_name, "r"."major_name" major_name, "r"."minor_name" minor_name, "r"."slang" slang FROM "app"."poi" "p" INNER JOIN "app"."region" "r" ON  "r"."id"="p"."region_id" AND "r"."deleted_at" IS NULL WHERE ( "p"."deleted_at" IS NULL ) AND ( "p"."deleted_at" IS NULL )`);
        await queryRunner.query(`INSERT INTO "app"."typeorm_metadata"("database", "schema", "table", "type", "name", "value") VALUES (DEFAULT, $1, DEFAULT, $2, $3, $4)`, ["app","VIEW","poi_current","SELECT \"p\".\"id\" id, \"r\".\"hex_id\" hex_id, \"p\".\"region_id\" region_id, \"p\".\"war_number\" war_number, \"p\".\"x\" x, \"p\".\"y\" y, \"p\".\"marker_type\" marker_type, \"r\".\"x\" rx, \"r\".\"y\" ry, \"r\".\"hex_name\" hex_name, \"r\".\"major_name\" major_name, \"r\".\"minor_name\" minor_name, \"r\".\"slang\" slang FROM \"app\".\"poi\" \"p\" INNER JOIN \"app\".\"region\" \"r\" ON  \"r\".\"id\"=\"p\".\"region_id\" AND \"r\".\"deleted_at\" IS NULL WHERE ( \"p\".\"deleted_at\" IS NULL ) AND ( \"p\".\"deleted_at\" IS NULL )"]);
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
        await queryRunner.query(`INSERT INTO "app"."typeorm_metadata"("database", "schema", "table", "type", "name", "value") VALUES (DEFAULT, $1, DEFAULT, $2, $3, $4)`, ["app","VIEW","catalog_expanded","SELECT id, code_name, (data ->> 'DisplayName')::text display_name, foxhole_version, catalog_version, (\n            CASE\n              WHEN data ? 'FactionVariant'\n              AND (data ->> 'FactionVariant') = 'EFactionId::Wardens' THEN 'WARDENS'::\"app\".faction\n              WHEN data ? 'FactionVariant'\n              AND (data ->> 'FactionVariant') = 'EFactionId::Colonials' THEN 'COLONIALS'::\"app\".faction\n              ELSE 'NONE'::\"app\".faction\n            END\n          ) faction, (\n          CASE\n            WHEN data ? 'ItemProfileType' THEN (data ->> 'ItemProfileType')::text\n            WHEN data ? 'VehicleProfileType' THEN (data ->> 'VehicleProfileType')::text\n            WHEN data ? 'ShippableInfo' THEN (data ->> 'ShippableInfo')::text\n            WHEN data ->> 'CodeName' IN ('MaterialPlatform') THEN 'EShippableType::Normal'\n            ELSE NULL\n          END\n        ) category, (\n          CASE\n            WHEN data ? 'ItemDynamicData' THEN (data #> '{ItemDynamicData,QuantityPerCrate}')::int\n            ELSE NULL\n          END\n        ) crate_quantity, (\n          CASE\n            WHEN data ? 'ItemProfileData' THEN (data #> '{ItemProfileData,ReserveStockpileMaxQuantity}')::int\n            ELSE NULL\n          END\n        ) crate_stockpile_maximum, (\n          CASE\n            WHEN data ? 'VehiclesPerCrateBonusQuantity'\n              AND data ->> 'VehicleBuildType' IN ('EVehicleBuildType::VehicleFactory', 'EVehicleBuildType::Shipyard') THEN 3 + (data -> 'VehiclesPerCrateBonusQuantity')::int\n            WHEN (\n              data ? 'VehicleDynamicData'\n              AND data ->> 'VehicleBuildType' IN ('EVehicleBuildType::VehicleFactory', 'EVehicleBuildType::Shipyard')\n            )\n            OR (\n              data ? 'BuildLocationType'\n              AND data ->> 'BuildLocationType' IN ('EBuildLocationType::ConstructionYard')\n            )\n            OR data ->> 'CodeName' IN (\n              'Construction',\n              'Crane'\n            ) THEN 3\n            ELSE NULL\n          END\n        ) shippable_quantity, (\n          CASE\n            WHEN (\n              data ? 'VehicleDynamicData'\n              AND data ->> 'VehicleBuildType' IN ('EVehicleBuildType::VehicleFactory', 'EVehicleBuildType::Shipyard')\n            ) \n            OR (\n              data ? 'VehicleProfileType'\n              AND data ->> 'VehicleProfileType' IN (\n                'EVehicleProfileType::Construction',\n                'EVehicleProfileType::FieldWeapon',\n                'EVehicleProfileType::Tank',\n                'EVehicleProfileType::TrackedTransport',\n                'EVehicleProfileType::WheeledArmoured',\n                'EVehicleProfileType::WheeledTransport',\n                'EVehicleProfileType::Trailer',\n                'EVehicleProfileType::OpenRoofWheeledTransport'\n              )\n              AND (\n                NOT data ? 'TechID'\n                OR data ->> 'TechID' NOT IN (\n                  'ETechID::UnlockBattleTank'\n                )\n              )\n            ) \n            OR (\n              data ? 'BuildLocationType'\n              AND data ->> 'BuildLocationType' IN ('EBuildLocationType::ConstructionYard')\n            ) THEN 10\n            ELSE NULL\n          END\n        ) shippable_stockpile_maximum, data, created_at FROM \"app\".\"catalog\" \"c\""]);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DELETE FROM "app"."typeorm_metadata" WHERE "type" = $1 AND "name" = $2 AND "schema" = $3`, ["VIEW","catalog_expanded","app"]);
        await queryRunner.query(`DROP VIEW "app"."catalog_expanded"`);
        await queryRunner.query(`DELETE FROM "app"."typeorm_metadata" WHERE "type" = $1 AND "name" = $2 AND "schema" = $3`, ["VIEW","poi_current","app"]);
        await queryRunner.query(`DROP VIEW "app"."poi_current"`);
        await queryRunner.query(`DELETE FROM "app"."typeorm_metadata" WHERE "type" = $1 AND "name" = $2 AND "schema" = $3`, ["VIEW","region_log_current","app"]);
        await queryRunner.query(`DROP VIEW "app"."region_log_current"`);
        await queryRunner.query(`DELETE FROM "app"."typeorm_metadata" WHERE "type" = $1 AND "name" = $2 AND "schema" = $3`, ["VIEW","region_current","app"]);
        await queryRunner.query(`DROP VIEW "app"."region_current"`);
    }

}
