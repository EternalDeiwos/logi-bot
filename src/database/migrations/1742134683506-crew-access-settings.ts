import { MigrationInterface, QueryRunner } from 'typeorm';

export class CrewAccessSettings1742134683506 implements MigrationInterface {
  name = 'CrewAccessSettings1742134683506';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "app"."crew_access_action_enum" AS ENUM('crew.setting.manage', 'crew.ticket.manage')`,
    );
    await queryRunner.query(
      `CREATE TYPE "app"."crew_access_access_enum" AS ENUM('0', '1', '10', '100')`,
    );
    await queryRunner.query(
      `CREATE TABLE "app"."crew_access" ("id" uuid NOT NULL DEFAULT uuidv7(), "action" "app"."crew_access_action_enum" NOT NULL, "access" "app"."crew_access_access_enum" NOT NULL DEFAULT '100', "rule_id" uuid NOT NULL, "crew_id" uuid NOT NULL, "created_by_sf" bigint NOT NULL, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "deleted_at" TIMESTAMP WITH TIME ZONE, CONSTRAINT "uk_access_rule_crew_deleted_at" UNIQUE NULLS NOT DISTINCT ("rule_id", "crew_id", "action", "deleted_at"), CONSTRAINT "pk_crew_access_id" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "rule_id_idx_crew_access" ON "app"."crew_access" ("rule_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "crew_id_idx_crew_access" ON "app"."crew_access" ("crew_id") `,
    );
    await queryRunner.query(
      `CREATE TYPE "app"."crew_setting_name_enum" AS ENUM('crew.ticket_help', 'crew.enable_permanent', 'crew.enable_opsec', 'crew.enable_pruning', 'crew.enable_voice', 'crew.enable_text', 'crew.enable_triage')`,
    );
    await queryRunner.query(
      `CREATE TABLE "app"."crew_setting" ("name" "app"."crew_setting_name_enum" NOT NULL, "crew_id" uuid NOT NULL, "value" character varying NOT NULL, "updated_by_sf" bigint NOT NULL, "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "uk_setting_name_crew" UNIQUE ("name", "crew_id"), CONSTRAINT "pk_crew_setting" PRIMARY KEY ("name", "crew_id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "crew_id_idx_crew_setting" ON "app"."crew_setting" ("crew_id") `,
    );
    await queryRunner.query(
      `ALTER TABLE "app"."crew_access" ADD CONSTRAINT "fk_crew_access_rule_id" FOREIGN KEY ("rule_id") REFERENCES "app"."access_rule"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "app"."crew_access" ADD CONSTRAINT "fk_crew_access_crew_id" FOREIGN KEY ("crew_id") REFERENCES "app"."crew"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "app"."crew_setting" ADD CONSTRAINT "fk_crew_setting_crew_id" FOREIGN KEY ("crew_id") REFERENCES "app"."crew"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "app"."crew_setting" DROP CONSTRAINT "fk_crew_setting_crew_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "app"."crew_access" DROP CONSTRAINT "fk_crew_access_crew_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "app"."crew_access" DROP CONSTRAINT "fk_crew_access_rule_id"`,
    );
    await queryRunner.query(`DROP INDEX "app"."crew_id_idx_crew_setting"`);
    await queryRunner.query(`DROP TABLE "app"."crew_setting"`);
    await queryRunner.query(`DROP TYPE "app"."crew_setting_name_enum"`);
    await queryRunner.query(`DROP INDEX "app"."crew_id_idx_crew_access"`);
    await queryRunner.query(`DROP INDEX "app"."rule_id_idx_crew_access"`);
    await queryRunner.query(`DROP TABLE "app"."crew_access"`);
    await queryRunner.query(`DROP TYPE "app"."crew_access_access_enum"`);
    await queryRunner.query(`DROP TYPE "app"."crew_access_action_enum"`);
  }
}
