import { MigrationInterface, QueryRunner } from 'typeorm';

export class TicketHelp1741347210790 implements MigrationInterface {
  name = 'TicketHelp1741347210790';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "app"."crew" ADD "ticket_help" text`);
    await queryRunner.query(
      `ALTER TYPE "app"."ticket_state_enum" RENAME TO "ticket_state_enum_old"`,
    );
    await queryRunner.query(
      `CREATE TYPE "app"."ticket_state_enum" AS ENUM('Triage', 'Accepted', 'Declined', 'Repeatable', 'In Progress', 'Ready for Pickup/Delivery', 'On Hold', 'Done', 'Moved', 'Abandoned')`,
    );
    await queryRunner.query(`ALTER TABLE "app"."ticket" ALTER COLUMN "state" DROP DEFAULT`);
    await queryRunner.query(
      `ALTER TABLE "app"."ticket" ALTER COLUMN "state" TYPE "app"."ticket_state_enum" USING "state"::"text"::"app"."ticket_state_enum"`,
    );
    await queryRunner.query(`ALTER TABLE "app"."ticket" ALTER COLUMN "state" SET DEFAULT 'Triage'`);
    await queryRunner.query(`DROP TYPE "app"."ticket_state_enum_old"`);
    await queryRunner.query(
      `ALTER TABLE "app"."guild_access" DROP CONSTRAINT "uk_access_rule_guild_deleted_at"`,
    );
    await queryRunner.query(
      `ALTER TABLE "app"."guild_access" ADD CONSTRAINT "uk_access_rule_guild_deleted_at" UNIQUE NULLS NOT DISTINCT ("rule_id", "guild_id", "access", "deleted_at")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "app"."ticket_state_enum_old" AS ENUM('Triage', 'Accepted', 'Declined', 'Repeatable', 'In Progress', 'Done', 'Moved', 'Abandoned')`,
    );
    await queryRunner.query(`ALTER TABLE "app"."ticket" ALTER COLUMN "state" DROP DEFAULT`);
    await queryRunner.query(
      `ALTER TABLE "app"."ticket" ALTER COLUMN "state" TYPE "app"."ticket_state_enum_old" USING "state"::"text"::"app"."ticket_state_enum_old"`,
    );
    await queryRunner.query(`ALTER TABLE "app"."ticket" ALTER COLUMN "state" SET DEFAULT 'Triage'`);
    await queryRunner.query(`DROP TYPE "app"."ticket_state_enum"`);
    await queryRunner.query(
      `ALTER TYPE "app"."ticket_state_enum_old" RENAME TO "ticket_state_enum"`,
    );
    await queryRunner.query(`ALTER TABLE "app"."crew" DROP COLUMN "ticket_help"`);
    await queryRunner.query(
      `ALTER TABLE "app"."guild_access" DROP CONSTRAINT "uk_access_rule_guild_deleted_at"`,
    );
    await queryRunner.query(
      `ALTER TABLE "app"."guild_access" ADD CONSTRAINT "uk_access_rule_guild_deleted_at" UNIQUE NULLS NOT DISTINCT ("rule_id", "guild_id", "deleted_at")`,
    );
  }
}
