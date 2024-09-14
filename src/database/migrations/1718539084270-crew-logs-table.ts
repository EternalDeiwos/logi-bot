import { MigrationInterface, QueryRunner } from "typeorm";

export class CrewLogsTable1718539084270 implements MigrationInterface {
    name = 'CrewLogsTable1718539084270'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "app"."crew_log" ("thread_sf" bigint NOT NULL, "guild_sf" bigint NOT NULL, "crew_channel_sf" bigint NOT NULL, "content" text NOT NULL, "created_by_sf" bigint NOT NULL, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "deleted_at" TIMESTAMP WITH TIME ZONE, CONSTRAINT "PK_23c06a4ac2074609bdb1ac9a5e6" PRIMARY KEY ("thread_sf"))`);
        await queryRunner.query(`CREATE INDEX "IDX_a6c9430a774b5080281e7e8d57" ON "app"."crew_log" ("guild_sf") `);
        await queryRunner.query(`CREATE INDEX "IDX_ec43595a7f5ff57a09731e4734" ON "app"."crew_log" ("crew_channel_sf") `);
        await queryRunner.query(`CREATE INDEX "IDX_5f861e5ca69d62ef9b257255c1" ON "app"."crew_log" ("content") `);
        await queryRunner.query(`ALTER TABLE "app"."crew_log" ADD CONSTRAINT "FK_ec43595a7f5ff57a09731e47342" FOREIGN KEY ("crew_channel_sf") REFERENCES "app"."crew"("crew_channel_sf") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "app"."crew_log" DROP CONSTRAINT "FK_ec43595a7f5ff57a09731e47342"`);
        await queryRunner.query(`DROP INDEX "app"."IDX_5f861e5ca69d62ef9b257255c1"`);
        await queryRunner.query(`DROP INDEX "app"."IDX_ec43595a7f5ff57a09731e4734"`);
        await queryRunner.query(`DROP INDEX "app"."IDX_a6c9430a774b5080281e7e8d57"`);
        await queryRunner.query(`DROP TABLE "app"."crew_log"`);
    }

}
