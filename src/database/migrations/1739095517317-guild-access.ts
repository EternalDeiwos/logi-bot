import { MigrationInterface, QueryRunner } from 'typeorm';

export class GuildAccess1739095517317 implements MigrationInterface {
  name = 'GuildAccess1739095517317';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "app"."guild_access_action_enum" AS ENUM('guild.setting.manage', 'crew.manage', 'stockpile.manage')`,
    );
    await queryRunner.query(
      `CREATE TYPE "app"."guild_access_access_enum" AS ENUM('0', '1', '10', '100')`,
    );
    await queryRunner.query(
      `CREATE TABLE "app"."guild_access" (
        "id" uuid NOT NULL DEFAULT uuidv7(),
        "action" "app"."guild_access_action_enum" NOT NULL,
        "access" "app"."guild_access_access_enum" NOT NULL DEFAULT '100',
        "rule_id" uuid NOT NULL,
        "guild_id" uuid NOT NULL,
        "created_by_sf" bigint NOT NULL,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "deleted_at" TIMESTAMP WITH TIME ZONE,
        CONSTRAINT "uk_access_rule_guild_deleted_at" UNIQUE NULLS NOT DISTINCT ("rule_id", "guild_id", "deleted_at"),
        CONSTRAINT "pk_guild_access_id" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "rule_id_idx_guild_access" ON "app"."guild_access" ("rule_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "guild_id_idx_guild_access" ON "app"."guild_access" ("guild_id") `,
    );
    await queryRunner.query(
      `CREATE TYPE "app"."guild_setting_name_enum" AS ENUM('guild.voice_category', 'guild.triage_crew_sf', 'guild.log_channel', 'stockpile.log_channel', 'crew.audit_channel', 'crew.viewer_role', 'crew.leader_role')`,
    );
    await queryRunner.query(
      `CREATE TABLE "app"."guild_setting" (
        "name" "app"."guild_setting_name_enum" NOT NULL,
        "guild_id" uuid NOT NULL,
        "value" character varying NOT NULL,
        "updated_by_sf" bigint NOT NULL,
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "pk_guild_setting" PRIMARY KEY ("name", "guild_id"))`,
    );
    await queryRunner.query(
      `ALTER TABLE "app"."guild_setting" ADD CONSTRAINT "uk_setting_name_guild" UNIQUE ("name", "guild_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "guild_id_idx_guild_setting" ON "app"."guild_setting" ("guild_id") `,
    );
    await queryRunner.query(
      `ALTER TABLE "app"."guild_access" ADD CONSTRAINT "fk_guild_access_rule_id" FOREIGN KEY ("rule_id") REFERENCES "app"."access_rule"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "app"."guild_access" ADD CONSTRAINT "fk_guild_access_guild_id" FOREIGN KEY ("guild_id") REFERENCES "app"."guild"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "app"."guild_setting" ADD CONSTRAINT "fk_guild_setting_guild_id" FOREIGN KEY ("guild_id") REFERENCES "app"."guild"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `WITH "mapping" ("old", "new") AS (
        VALUES ('globalVoiceCategory', 'guild.voice_category'),
               ('ticketTriageCrew', 'guild.triage_crew_sf'),
               ('globalLogChannel', 'guild.log_channel'),
               ('stockpileLogChannel', 'stockpile.log_channel'),
               ('crewAuditChannel', 'crew.audit_channel'),
               ('crewViewerRole', 'crew.viewer_role'),
               ('crewLeaderRole', 'crew.leader_role')
      )
      INSERT INTO "app"."guild_setting" ("name", "guild_id", "value", "updated_by_sf")
      SELECT
        m."new"::"app"."guild_setting_name_enum" as "name",
        g."id" as "guild_id",
        c."value" as "value",
        g."guild_sf" as "updated_by_sf"
      FROM
        "app"."guild" g,
        jsonb_each_text(g."config") c
      JOIN "mapping" m ON m."old" = c."key"`,
    );
    await queryRunner.query(`ALTER TABLE "app"."guild" DROP COLUMN "config"`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "app"."guild" ADD "config" JSONB NOT NULL DEFAULT '{}'`);
    await queryRunner.query(
      `WITH "mapping" ("old", "new") AS (
        VALUES ('globalVoiceCategory', 'guild.voice_category'),
               ('ticketTriageCrew', 'guild.triage_crew_sf'),
               ('globalLogChannel', 'guild.log_channel'),
               ('stockpileLogChannel', 'stockpile.log_channel'),
               ('crewAuditChannel', 'crew.audit_channel'),
               ('crewViewerRole', 'crew.viewer_role'),
               ('crewLeaderRole', 'crew.leader_role')
      )
      MERGE INTO "app"."guild" target USING (
        SELECT g."guild_id" as "guild_id", jsonb_object_agg(m."old", g."value") as "config"
        FROM "app"."guild_setting" g
        JOIN "mapping" m ON m."new" = g."name"::text
        GROUP BY g."guild_id"
      ) source ON source."guild_id" = target."id"
      WHEN MATCHED THEN 
        UPDATE SET "config"=source."config"`,
    );
    await queryRunner.query(
      `ALTER TABLE "app"."guild_setting" DROP CONSTRAINT "fk_guild_setting_guild_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "app"."guild_access" DROP CONSTRAINT "fk_guild_access_guild_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "app"."guild_access" DROP CONSTRAINT "fk_guild_access_rule_id"`,
    );
    await queryRunner.query(`DROP INDEX "app"."guild_id_idx_guild_setting"`);
    await queryRunner.query(`DROP TABLE "app"."guild_setting"`);
    await queryRunner.query(`DROP TYPE "app"."guild_setting_name_enum"`);
    await queryRunner.query(`DROP INDEX "app"."guild_id_idx_guild_access"`);
    await queryRunner.query(`DROP INDEX "app"."rule_id_idx_guild_access"`);
    await queryRunner.query(`DROP TABLE "app"."guild_access"`);
    await queryRunner.query(`DROP TYPE "app"."guild_access_access_enum"`);
    await queryRunner.query(`DROP TYPE "app"."guild_access_action_enum"`);
  }
}
