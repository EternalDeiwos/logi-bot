import { MigrationInterface, QueryRunner } from 'typeorm';

export class TicketStates1741528182622 implements MigrationInterface {
  name = 'TicketStates1741528182622';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TYPE "app"."ticket_state_enum" RENAME TO "ticket_state_enum_old"`,
    );
    await queryRunner.query(
      `CREATE TYPE "app"."ticket_state_enum" AS ENUM('Triage', 'Accepted', 'Declined', 'Repeatable', 'In Progress', 'Ready for Pickup/Delivery', 'On Hold', 'Queued', 'Done', 'Moved', 'Abandoned')`,
    );
    await queryRunner.query(`ALTER TABLE "app"."ticket" ALTER COLUMN "state" DROP DEFAULT`);
    await queryRunner.query(
      `ALTER TABLE "app"."ticket" ALTER COLUMN "state" TYPE "app"."ticket_state_enum" USING "state"::"text"::"app"."ticket_state_enum"`,
    );
    await queryRunner.query(`ALTER TABLE "app"."ticket" ALTER COLUMN "state" SET DEFAULT 'Triage'`);
    await queryRunner.query(`DROP TYPE "app"."ticket_state_enum_old"`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "app"."ticket_state_enum_old" AS ENUM('Triage', 'Accepted', 'Declined', 'Repeatable', 'In Progress', 'Ready for Pickup/Delivery', 'On Hold', 'Done', 'Moved', 'Abandoned')`,
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
  }
}
