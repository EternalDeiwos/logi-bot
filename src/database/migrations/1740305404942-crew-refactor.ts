import { MigrationInterface, QueryRunner } from 'typeorm';

export class CrewRefactor1740305404942 implements MigrationInterface {
  name = 'CrewRefactor1740305404942';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "app"."ticket_state_enum" AS ENUM('Triage', 'Accepted', 'Declined', 'Repeatable', 'In Progress', 'Done', 'Moved', 'Abandoned')`,
    );
    await queryRunner.query(
      `ALTER TABLE "app"."ticket" ADD "state" "app"."ticket_state_enum" NOT NULL DEFAULT 'Triage'`,
    );
    await queryRunner.query(
      `ALTER TABLE "app"."crew" ADD "is_pruning" boolean NOT NULL DEFAULT false`,
    );
    await queryRunner.query(
      `COMMENT ON COLUMN "app"."crew"."is_pruning" IS 'Crew will not be pruned'`,
    );
    await queryRunner.query(
      `ALTER TABLE "app"."crew" ADD "require_voice_channel" boolean NOT NULL DEFAULT false`,
    );
    await queryRunner.query(
      `COMMENT ON COLUMN "app"."crew"."require_voice_channel" IS 'Crew will be created with a voice channel'`,
    );
    await queryRunner.query(`ALTER TABLE "app"."crew" ADD "approved_by_sf" bigint`);
    await queryRunner.query(`ALTER TABLE "app"."crew" DROP CONSTRAINT "uk_guild_crew_deleted_at"`);
    await queryRunner.query(
      `ALTER TABLE "app"."crew" ALTER COLUMN "crew_channel_sf" DROP NOT NULL`,
    );
    await queryRunner.query(`ALTER TABLE "app"."crew" ALTER COLUMN "role_sf" DROP NOT NULL`);
    await queryRunner.query(
      `ALTER TABLE "app"."guild_setting" DROP CONSTRAINT "uk_setting_name_guild"`,
    );
    await queryRunner.query(
      `ALTER TYPE "app"."guild_setting_name_enum" RENAME TO "guild_setting_name_enum_old"`,
    );
    await queryRunner.query(
      `CREATE TYPE "app"."guild_setting_name_enum" AS ENUM('guild.voice_category', 'guild.triage_crew_sf', 'guild.log_channel', 'guild.crew_prefix', 'stockpile.log_channel', 'counter.log_channel', 'crew.audit_channel', 'crew.viewer_role', 'crew.leader_role')`,
    );
    await queryRunner.query(
      `ALTER TABLE "app"."guild_setting" ALTER COLUMN "name" TYPE "app"."guild_setting_name_enum" USING "name"::"text"::"app"."guild_setting_name_enum"`,
    );
    await queryRunner.query(`DROP TYPE "app"."guild_setting_name_enum_old"`);
    await queryRunner.query(
      `ALTER TABLE "app"."crew" ADD CONSTRAINT "uk_guild_crew_deleted_at" UNIQUE NULLS NOT DISTINCT ("guild_id", "crew_channel_sf", "deleted_at")`,
    );
    await queryRunner.query(
      `ALTER TABLE "app"."guild_setting" ADD CONSTRAINT "uk_setting_name_guild" UNIQUE ("name", "guild_id")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "app"."guild_setting" DROP CONSTRAINT "uk_setting_name_guild"`,
    );
    await queryRunner.query(`ALTER TABLE "app"."crew" DROP CONSTRAINT "uk_guild_crew_deleted_at"`);
    await queryRunner.query(
      `CREATE TYPE "app"."guild_setting_name_enum_old" AS ENUM('guild.voice_category', 'guild.triage_crew_sf', 'guild.log_channel', 'stockpile.log_channel', 'crew.audit_channel', 'crew.viewer_role', 'crew.leader_role')`,
    );
    await queryRunner.query(
      `ALTER TABLE "app"."guild_setting" ALTER COLUMN "name" TYPE "app"."guild_setting_name_enum_old" USING "name"::"text"::"app"."guild_setting_name_enum_old"`,
    );
    await queryRunner.query(`DROP TYPE "app"."guild_setting_name_enum"`);
    await queryRunner.query(
      `ALTER TYPE "app"."guild_setting_name_enum_old" RENAME TO "guild_setting_name_enum"`,
    );
    await queryRunner.query(
      `ALTER TABLE "app"."guild_setting" ADD CONSTRAINT "uk_setting_name_guild" UNIQUE ("name", "guild_id")`,
    );
    await queryRunner.query(`ALTER TABLE "app"."crew" ALTER COLUMN "role_sf" SET NOT NULL`);
    await queryRunner.query(`ALTER TABLE "app"."crew" ALTER COLUMN "crew_channel_sf" SET NOT NULL`);
    await queryRunner.query(
      `ALTER TABLE "app"."crew" ADD CONSTRAINT "uk_guild_crew_deleted_at" UNIQUE NULLS NOT DISTINCT("crew_channel_sf", "deleted_at", "guild_id")`,
    );
    await queryRunner.query(`ALTER TABLE "app"."crew" DROP COLUMN "approved_by_sf"`);
    await queryRunner.query(
      `COMMENT ON COLUMN "app"."crew"."require_voice_channel" IS 'Crew will be created with a voice channel'`,
    );
    await queryRunner.query(`ALTER TABLE "app"."crew" DROP COLUMN "require_voice_channel"`);
    await queryRunner.query(
      `COMMENT ON COLUMN "app"."crew"."is_pruning" IS 'Crew will not be pruned'`,
    );
    await queryRunner.query(`ALTER TABLE "app"."crew" DROP COLUMN "is_pruning"`);
    await queryRunner.query(`ALTER TABLE "app"."ticket" DROP COLUMN "state"`);
    await queryRunner.query(`DROP TYPE "app"."ticket_state_enum"`);
  }
}
