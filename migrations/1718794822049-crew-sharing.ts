import { MigrationInterface, QueryRunner } from "typeorm";

export class CrewSharing1718794822049 implements MigrationInterface {
    name = 'CrewSharing1718794822049'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "app"."guild" ("guild_sf" bigint NOT NULL, "name" character varying NOT NULL, "name_short" character varying NOT NULL, "icon" character varying, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_5922781211eba05d9f86f969faf" PRIMARY KEY ("guild_sf"))`);
        await queryRunner.query(`CREATE TABLE "app"."crew_share" ("crew_channel_sf" bigint NOT NULL, "target_guild_sf" bigint NOT NULL, "created_by_sf" bigint NOT NULL, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "deleted_at" TIMESTAMP WITH TIME ZONE, CONSTRAINT "PK_8a3d61426c982da4dafc31ac8b3" PRIMARY KEY ("crew_channel_sf", "target_guild_sf"))`);
        await queryRunner.query(`CREATE UNIQUE INDEX "crew_share_unique" ON "app"."crew_share" ("target_guild_sf", "crew_channel_sf") `);
        await queryRunner.query(`ALTER TABLE "app"."crew_share" ADD CONSTRAINT "FK_db9e3c836f7d17c1901d1947ad8" FOREIGN KEY ("crew_channel_sf") REFERENCES "app"."crew"("crew_channel_sf") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "app"."crew_share" ADD CONSTRAINT "FK_8b25647de2a9b3627002dd062ed" FOREIGN KEY ("target_guild_sf") REFERENCES "app"."guild"("guild_sf") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "app"."crew" ADD CONSTRAINT "FK_0bb46e1f423e8f8411ca7352329" FOREIGN KEY ("guild_sf") REFERENCES "app"."guild"("guild_sf") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "app"."crew" DROP CONSTRAINT "FK_0bb46e1f423e8f8411ca7352329"`);
        await queryRunner.query(`ALTER TABLE "app"."crew_share" DROP CONSTRAINT "FK_8b25647de2a9b3627002dd062ed"`);
        await queryRunner.query(`ALTER TABLE "app"."crew_share" DROP CONSTRAINT "FK_db9e3c836f7d17c1901d1947ad8"`);
        await queryRunner.query(`DROP INDEX "app"."crew_share_unique"`);
        await queryRunner.query(`DROP TABLE "app"."crew_share"`);
        await queryRunner.query(`DROP TABLE "app"."guild"`);
    }

}
