import { MigrationInterface, QueryRunner } from "typeorm";

export class TeamAudit1715527531776 implements MigrationInterface {
    name = 'TeamAudit1715527531776'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "app"."team" ADD "audit_channel_sf" bigint`);
        await queryRunner.query(`CREATE INDEX "IDX_534486bcedafa6d660e17fce5c" ON "app"."team" ("audit_channel_sf") `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "app"."IDX_534486bcedafa6d660e17fce5c"`);
        await queryRunner.query(`ALTER TABLE "app"."team" DROP COLUMN "audit_channel_sf"`);
    }

}
