import { MigrationInterface, QueryRunner } from 'typeorm';

export class GameTables1726307788459 implements MigrationInterface {
  name = 'GameTables1726307788459';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE TYPE "app"."faction" AS ENUM('WARDENS', 'COLONIALS', 'NONE')`);
    await queryRunner.query(
      `CREATE TABLE "app"."war" ("war_number" bigint NOT NULL, "winner" "app"."faction" NOT NULL DEFAULT 'NONE', "clapfoot_id" character varying NOT NULL, "started_at" TIMESTAMP WITH TIME ZONE NOT NULL, "ended_at" TIMESTAMP WITH TIME ZONE, CONSTRAINT "uk_clapfoot_id_war" UNIQUE ("clapfoot_id"), CONSTRAINT "pk_war_number" PRIMARY KEY ("war_number"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "app"."region" ("id" uuid NOT NULL DEFAULT uuidv7(), "hex_id" bigint NOT NULL, "map_name" character varying NOT NULL, "hex_name" character varying NOT NULL, "major_name" character varying, "minor_name" character varying, "slang" text array NOT NULL DEFAULT '{}', "x" double precision NOT NULL, "y" double precision NOT NULL, "deleted_at" TIMESTAMP WITH TIME ZONE, CONSTRAINT "uk_hex_major_minor_deleted_at" UNIQUE ("hex_id", "major_name", "minor_name", "deleted_at"), CONSTRAINT "pk_region_id" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(`CREATE INDEX "hex_idx_region" ON "app"."region" ("hex_id") `);
    await queryRunner.query(
      `CREATE TABLE "app"."region_log" ("id" character varying NOT NULL DEFAULT uuidv7(), "hex_id" bigint NOT NULL, "version" bigint NOT NULL, "war_number" bigint NOT NULL, "data" jsonb NOT NULL, "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL, CONSTRAINT "pk_region_log_id" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(`CREATE INDEX "hex_idx_region_log" ON "app"."region_log" ("hex_id") `);
    await queryRunner.query(
      `CREATE INDEX "war_number_idx_region_log" ON "app"."region_log" ("war_number") `,
    );
    await queryRunner.query(
      `CREATE INDEX "updated_at_idx_region_log" ON "app"."region_log" ("updated_at") `,
    );
    await queryRunner.query(
      `CREATE TABLE "app"."poi" ("id" BIGSERIAL NOT NULL, "region_id" uuid NOT NULL, "war_number" bigint NOT NULL, "marker_type" integer NOT NULL, "x" double precision NOT NULL, "y" double precision NOT NULL, "deleted_at" TIMESTAMP WITH TIME ZONE, CONSTRAINT "pk_poi_id" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(`CREATE INDEX "region_idx_poi" ON "app"."poi" ("region_id") `);
    await queryRunner.query(`CREATE INDEX "war_number_idx_poi" ON "app"."poi" ("war_number") `);
    await queryRunner.query(`CREATE INDEX "marker_type_idx_poi" ON "app"."poi" ("marker_type") `);
    await queryRunner.query(
      `CREATE TABLE "app"."catalog" ("id" uuid NOT NULL DEFAULT uuidv7(), "foxhole_version" character varying NOT NULL, "catalog_version" character varying NOT NULL, "code_name" character varying NOT NULL, "slang" text array NOT NULL DEFAULT '{}', "data" jsonb NOT NULL, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "uk_foxhole_catalog_name" UNIQUE ("foxhole_version", "catalog_version", "code_name"), CONSTRAINT "pk_catalog_id" PRIMARY KEY ("id"))`,
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
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "app"."poi" DROP CONSTRAINT "fk_poi_war_number"`);
    await queryRunner.query(`ALTER TABLE "app"."poi" DROP CONSTRAINT "fk_poi_region_id"`);
    await queryRunner.query(
      `ALTER TABLE "app"."region_log" DROP CONSTRAINT "fk_region_log_war_number"`,
    );
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
