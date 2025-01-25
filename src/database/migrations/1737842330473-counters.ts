import { MigrationInterface, QueryRunner } from 'typeorm';

export class Counters1737842330473 implements MigrationInterface {
  name = 'Counters1737842330473';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "app"."stockpile_access" DROP CONSTRAINT "fk_stockpile_entry_stockpile_id"`,
    );
    await queryRunner.query(
      `CREATE TABLE "app"."counter_access" ("id" uuid NOT NULL DEFAULT uuidv7(), "rule_id" uuid NOT NULL, "counter_id" uuid NOT NULL, "created_by_sf" bigint NOT NULL, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "deleted_at" TIMESTAMP WITH TIME ZONE, CONSTRAINT "uk_rule_counter_deleted_at" UNIQUE NULLS NOT DISTINCT ("rule_id", "counter_id", "deleted_at"), CONSTRAINT "pk_counter_access_id" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "rule_id_idx_counter_access" ON "app"."counter_access" ("rule_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "counter_id_idx_counter_access" ON "app"."counter_access" ("counter_id") `,
    );
    await queryRunner.query(
      `CREATE TABLE "app"."counter_entry" ("id" uuid NOT NULL DEFAULT uuidv7(), "counter_id" uuid NOT NULL, "value" integer NOT NULL DEFAULT '0', "created_by_sf" bigint NOT NULL, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "pk_counter_entry_id" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "counter_id_idx_counter_entry" ON "app"."counter_entry" ("counter_id") `,
    );
    await queryRunner.query(
      `CREATE TYPE "app"."counter_kind_enum" AS ENUM('Simple', 'Reserve', 'Export', 'Kill')`,
    );
    await queryRunner.query(
      `CREATE TABLE "app"."counter" ("id" uuid NOT NULL DEFAULT uuidv7(), "war_number" bigint NOT NULL, "guild_id" uuid NOT NULL, "crew_id" uuid, "catalog_id" uuid, "name" character varying NOT NULL, "kind" "app"."counter_kind_enum" NOT NULL DEFAULT 'Simple', "metadata" jsonb NOT NULL DEFAULT '{}', "created_by_sf" bigint NOT NULL, "deleted_by_sf" bigint, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "deleted_at" TIMESTAMP WITH TIME ZONE, CONSTRAINT "pk_counter_id" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "war_number_idx_counter" ON "app"."counter" ("war_number") `,
    );
    await queryRunner.query(`CREATE INDEX "guild_id_idx_counter" ON "app"."counter" ("guild_id") `);
    await queryRunner.query(`CREATE INDEX "crew_id_idx_counter" ON "app"."counter" ("crew_id") `);
    await queryRunner.query(
      `CREATE INDEX "catalog_id_idx_counter" ON "app"."counter" ("catalog_id") `,
    );
    await queryRunner.query(
      `CREATE TYPE "app"."stockpile_access_access_enum" AS ENUM('0', '1', '10', '100')`,
    );
    await queryRunner.query(
      `ALTER TABLE "app"."stockpile_access" ADD "access" "app"."stockpile_access_access_enum" NOT NULL DEFAULT '100'`,
    );
    await queryRunner.query(
      `ALTER TABLE "app"."stockpile_access" ADD CONSTRAINT "fk_stockpile_access_stockpile_id" FOREIGN KEY ("stockpile_id") REFERENCES "app"."stockpile"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "app"."counter_access" ADD CONSTRAINT "fk_counter_access_rule_id" FOREIGN KEY ("rule_id") REFERENCES "app"."access_rule"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "app"."counter_access" ADD CONSTRAINT "fk_counter_access_counter_id" FOREIGN KEY ("counter_id") REFERENCES "app"."counter"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "app"."counter_entry" ADD CONSTRAINT "fk_counter_entry_counter_id" FOREIGN KEY ("counter_id") REFERENCES "app"."counter"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "app"."counter" ADD CONSTRAINT "fk_counter_war_number" FOREIGN KEY ("war_number") REFERENCES "app"."war"("war_number") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "app"."counter" ADD CONSTRAINT "fk_counter_guild_id" FOREIGN KEY ("guild_id") REFERENCES "app"."guild"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "app"."counter" ADD CONSTRAINT "fk_counter_crew_id" FOREIGN KEY ("crew_id") REFERENCES "app"."crew"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "app"."counter" ADD CONSTRAINT "fk_counter_catalog_id" FOREIGN KEY ("catalog_id") REFERENCES "app"."catalog"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `CREATE VIEW "app"."counter_current" AS SELECT "counter"."id" AS "id", "counter"."name" AS "name", "counter"."kind" AS "kind", "counter"."metadata" AS "metadata", "counter"."guild_id" AS "guild_id", "counter"."catalog_id" AS "catalog_id", "counter"."crew_id" AS "crew_id", "counter"."war_number" AS "war_number", "counter"."created_at" AS "created_at", "counter"."created_by_sf" AS "created_by_sf", entry.id AS "entry_id", COALESCE(entry.value, 0) AS "entry_value", entry.created_at AS "entry_created_at", entry.created_by_sf AS "entry_created_by_sf" FROM "app"."counter" "counter" INNER JOIN (SELECT war_number FROM "app"."war" "war" ORDER BY "war"."war_number" DESC LIMIT 1) "war" ON war.war_number="counter"."war_number"  LEFT JOIN (SELECT DISTINCT ON ("entry"."counter_id") entry.* FROM "app"."counter_entry" "entry" ORDER BY "entry"."counter_id" ASC, "entry"."created_at" DESC) "entry" ON "counter"."id"=entry.counter_id WHERE "counter"."deleted_at" IS NULL ORDER BY "counter"."created_at" ASC`,
    );
    await queryRunner.query(
      `INSERT INTO "app"."typeorm_metadata"("database", "schema", "table", "type", "name", "value") VALUES (DEFAULT, $1, DEFAULT, $2, $3, $4)`,
      [
        'app',
        'VIEW',
        'counter_current',
        'SELECT "counter"."id" AS "id", "counter"."name" AS "name", "counter"."kind" AS "kind", "counter"."metadata" AS "metadata", "counter"."guild_id" AS "guild_id", "counter"."catalog_id" AS "catalog_id", "counter"."crew_id" AS "crew_id", "counter"."war_number" AS "war_number", "counter"."created_at" AS "created_at", "counter"."created_by_sf" AS "created_by_sf", entry.id AS "entry_id", COALESCE(entry.value, 0) AS "entry_value", entry.created_at AS "entry_created_at", entry.created_by_sf AS "entry_created_by_sf" FROM "app"."counter" "counter" INNER JOIN (SELECT war_number FROM "app"."war" "war" ORDER BY "war"."war_number" DESC LIMIT 1) "war" ON war.war_number="counter"."war_number"  LEFT JOIN (SELECT DISTINCT ON ("entry"."counter_id") entry.* FROM "app"."counter_entry" "entry" ORDER BY "entry"."counter_id" ASC, "entry"."created_at" DESC) "entry" ON "counter"."id"=entry.counter_id WHERE "counter"."deleted_at" IS NULL ORDER BY "counter"."created_at" ASC',
      ],
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DELETE FROM "app"."typeorm_metadata" WHERE "type" = $1 AND "name" = $2 AND "schema" = $3`,
      ['VIEW', 'counter_current', 'app'],
    );
    await queryRunner.query(`DROP VIEW IF EXISTS "app"."counter_current"`);
    await queryRunner.query(`ALTER TABLE "app"."counter" DROP CONSTRAINT "fk_counter_catalog_id"`);
    await queryRunner.query(`ALTER TABLE "app"."counter" DROP CONSTRAINT "fk_counter_crew_id"`);
    await queryRunner.query(`ALTER TABLE "app"."counter" DROP CONSTRAINT "fk_counter_guild_id"`);
    await queryRunner.query(`ALTER TABLE "app"."counter" DROP CONSTRAINT "fk_counter_war_number"`);
    await queryRunner.query(
      `ALTER TABLE "app"."counter_entry" DROP CONSTRAINT "fk_counter_entry_counter_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "app"."counter_access" DROP CONSTRAINT "fk_counter_access_counter_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "app"."counter_access" DROP CONSTRAINT "fk_counter_access_rule_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "app"."stockpile_access" DROP CONSTRAINT "fk_stockpile_access_stockpile_id"`,
    );
    await queryRunner.query(`ALTER TABLE "app"."stockpile_access" DROP COLUMN "access"`);
    await queryRunner.query(`DROP TYPE "app"."stockpile_access_access_enum"`);
    await queryRunner.query(`DROP INDEX "app"."catalog_id_idx_counter"`);
    await queryRunner.query(`DROP INDEX "app"."crew_id_idx_counter"`);
    await queryRunner.query(`DROP INDEX "app"."guild_id_idx_counter"`);
    await queryRunner.query(`DROP INDEX "app"."war_number_idx_counter"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "app"."counter"`);
    await queryRunner.query(`DROP TYPE "app"."counter_kind_enum"`);
    await queryRunner.query(`DROP INDEX "app"."counter_id_idx_counter_entry"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "app"."counter_entry"`);
    await queryRunner.query(`DROP INDEX "app"."counter_id_idx_counter_access"`);
    await queryRunner.query(`DROP INDEX "app"."rule_id_idx_counter_access"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "app"."counter_access"`);
    await queryRunner.query(
      `ALTER TABLE "app"."stockpile_access" ADD CONSTRAINT "fk_stockpile_entry_stockpile_id" FOREIGN KEY ("stockpile_id", "stockpile_id") REFERENCES "app"."stockpile"("id","id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }
}
