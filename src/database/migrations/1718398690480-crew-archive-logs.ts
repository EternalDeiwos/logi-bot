import { MigrationInterface, QueryRunner } from "typeorm";

export class CrewArchiveLogs1718398690480 implements MigrationInterface {
    name = 'CrewArchiveLogs1718398690480'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "app"."crew" DROP CONSTRAINT "unique_short_name"`);
        await queryRunner.query(`ALTER TABLE "app"."crew" ADD "permanent" boolean NOT NULL DEFAULT false`);
        await queryRunner.query(`ALTER TABLE "app"."crew" ADD "deleted_at" TIMESTAMP WITH TIME ZONE`);
        await queryRunner.query(`CREATE UNIQUE INDEX "crew_member_unique" ON "app"."crew_member" ("member_sf", "crew_channel_sf") `);
        await queryRunner.query(`ALTER TABLE "app"."crew" ADD CONSTRAINT "unique_crew_tag_name" UNIQUE ("guild_sf", "name_short", "deleted_at")`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "app"."crew" DROP CONSTRAINT "unique_crew_tag_name"`);
        await queryRunner.query(`DROP INDEX "app"."crew_member_unique"`);
        await queryRunner.query(`ALTER TABLE "app"."crew" DROP COLUMN "deleted_at"`);
        await queryRunner.query(`ALTER TABLE "app"."crew" DROP COLUMN "permanent"`);
        await queryRunner.query(`ALTER TABLE "app"."crew" ADD CONSTRAINT "unique_short_name" UNIQUE ("guild_sf", "name_short")`);
    }

}
