import { MigrationInterface, QueryRunner } from 'typeorm';

export class CrewRefactorSettings1742135212790 implements MigrationInterface {
  name = 'CrewRefactorSettings1742135212790';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
        WITH ticket_help AS (
            SELECT 
                c.id AS crew_id, 
                'crew.ticket_help'::"app"."crew_setting_name_enum" AS name, 
                c.ticket_help::varchar AS value, 
                c.created_at AS updated_at, 
                c.created_by_sf AS updated_by_sf
            FROM "app"."crew" c
            WHERE c.ticket_help IS NOT NULL
            ORDER BY created_at desc
        ), permanent AS (
            SELECT 
                c.id AS crew_id, 
                'crew.enable_permanent'::"app"."crew_setting_name_enum" AS name, 
                c.is_permanent::varchar AS value, 
                c.created_at AS updated_at, 
                c.created_by_sf AS updated_by_sf
            FROM "app"."crew" c
            ORDER BY created_at desc
        ), opsec AS (
            SELECT 
                c.id AS crew_id, 
                'crew.enable_opsec'::"app"."crew_setting_name_enum" AS name, 
                c.secure_only::varchar AS value, 
                c.created_at AS updated_at, 
                c.created_by_sf AS updated_by_sf
            FROM "app"."crew" c
            ORDER BY created_at desc
        ), pruning AS (
            SELECT 
                c.id AS crew_id, 
                'crew.enable_pruning'::"app"."crew_setting_name_enum" AS name, 
                c.is_pruning::varchar AS value, 
                c.created_at AS updated_at, 
                c.created_by_sf AS updated_by_sf
            FROM "app"."crew" c
            ORDER BY created_at desc
        ), voice AS (
            SELECT 
                c.id AS crew_id, 
                'crew.enable_voice'::"app"."crew_setting_name_enum" AS name, 
                c.require_voice_channel::varchar AS value, 
                c.created_at AS updated_at, 
                c.created_by_sf AS updated_by_sf
            FROM "app"."crew" c
            ORDER BY created_at desc
        ), text AS (
            SELECT 
                c.id AS crew_id, 
                'crew.enable_text'::"app"."crew_setting_name_enum" AS name, 
                'true' AS value, c.created_at 
                AS updated_at, c.created_by_sf 
                AS updated_by_sf
            FROM "app"."crew" c
            ORDER BY created_at desc
        ), triage AS (
            SELECT 
                c.id AS crew_id, 
                'crew.enable_triage'::"app"."crew_setting_name_enum" AS name, 
                c.enable_move_prompt::varchar AS value, 
                c.created_at AS updated_at, 
                c.created_by_sf AS updated_by_sf
            FROM "app"."crew" c
            ORDER BY created_at desc
        )
        INSERT INTO "app"."crew_setting" (crew_id, name, value, updated_at, updated_by_sf)
        SELECT * FROM ticket_help UNION ALL
        SELECT * FROM permanent UNION ALL
        SELECT * FROM opsec UNION ALL
        SELECT * FROM pruning UNION ALL
        SELECT * FROM voice UNION ALL
        SELECT * FROM text UNION ALL
        SELECT * FROM triage
    `);
    await queryRunner.query(`ALTER TABLE "app"."crew" DROP COLUMN "enable_move_prompt"`);
    await queryRunner.query(`ALTER TABLE "app"."crew" DROP COLUMN "is_permanent"`);
    await queryRunner.query(`ALTER TABLE "app"."crew" DROP COLUMN "secure_only"`);
    await queryRunner.query(`ALTER TABLE "app"."crew" DROP COLUMN "is_pruning"`);
    await queryRunner.query(`ALTER TABLE "app"."crew" DROP COLUMN "require_voice_channel"`);
    await queryRunner.query(`ALTER TABLE "app"."crew" DROP COLUMN "ticket_help"`);
    await queryRunner.query(
      `ALTER TABLE "app"."crew_access" DROP CONSTRAINT "uk_access_rule_crew_deleted_at"`,
    );
    await queryRunner.query(`ALTER TABLE "app"."crew_access" DROP COLUMN "action"`);
    await queryRunner.query(
      `ALTER TABLE "app"."crew_access" ADD "action" "app"."crew_access_action_enum" NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "app"."crew_access" ADD CONSTRAINT "uk_access_rule_crew_deleted_at" UNIQUE ("rule_id", "crew_id", "action", "deleted_at")`,
    );
    await queryRunner.query(
      `ALTER TABLE "app"."crew_setting" ADD CONSTRAINT "uk_setting_name_crew" UNIQUE ("name", "crew_id")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "app"."crew_setting" DROP CONSTRAINT "uk_setting_name_crew"`,
    );
    await queryRunner.query(
      `ALTER TABLE "app"."crew_access" DROP CONSTRAINT "uk_access_rule_crew_deleted_at"`,
    );
    await queryRunner.query(`ALTER TABLE "app"."crew_access" DROP COLUMN "action"`);
    await queryRunner.query(
      `ALTER TABLE "app"."crew_access" ADD "action" "app"."crew_access_action_enum" NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "app"."crew_access" ADD CONSTRAINT "uk_access_rule_crew_deleted_at" UNIQUE ("action", "rule_id", "crew_id", "deleted_at")`,
    );
    await queryRunner.query(`ALTER TABLE "app"."crew" ADD "ticket_help" text`);
    await queryRunner.query(
      `ALTER TABLE "app"."crew" ADD "require_voice_channel" boolean NOT NULL DEFAULT false`,
    );
    await queryRunner.query(
      `ALTER TABLE "app"."crew" ADD "is_pruning" boolean NOT NULL DEFAULT false`,
    );
    await queryRunner.query(
      `ALTER TABLE "app"."crew" ADD "secure_only" boolean NOT NULL DEFAULT true`,
    );
    await queryRunner.query(
      `ALTER TABLE "app"."crew" ADD "is_permanent" boolean NOT NULL DEFAULT false`,
    );
    await queryRunner.query(
      `ALTER TABLE "app"."crew" ADD "enable_move_prompt" boolean NOT NULL DEFAULT false`,
    );
    await queryRunner.query(`
        WITH settings AS (
            SELECT
                s.crew_id,
                jsonb_object_agg(s.name, s.value) as obj
            FROM "app"."crew_setting" s
            GROUP BY s.crew_id
        )
        UPDATE "app"."crew" c
        SET ticket_help=s.obj->>'crew.ticket_help',
            is_permanent=(s.obj->>'crew.enable_permanent')::bool,
            secure_only=(s.obj->>'crew.enable_opsec')::bool,
            is_pruning=(s.obj->>'crew.enable_pruning')::bool,
            require_voice_channel=(s.obj->>'crew.enable_voice')::bool,
            enable_move_prompt=(s.obj->>'crew.enable_triage')::bool
        FROM settings s
        WHERE c.id=s.crew_id;
    `);
  }
}
