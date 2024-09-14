import { MigrationInterface, QueryRunner } from "typeorm";

export class Init1715321555159 implements MigrationInterface {
    name = 'Init1715321555159'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "app"."ticket" ("thread_sf" bigint NOT NULL, "guild_sf" bigint NOT NULL, "crew_channel_sf" bigint NOT NULL, "content" text NOT NULL, "name" character varying NOT NULL, "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_by_sf" bigint NOT NULL, "created_by_sf" bigint NOT NULL, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "deleted_at" TIMESTAMP WITH TIME ZONE, CONSTRAINT "PK_aa58f013374aeeb4f6ccb07f7c9" PRIMARY KEY ("thread_sf"))`);
        await queryRunner.query(`CREATE INDEX "IDX_a319b4040bfb996e9d5361b107" ON "app"."ticket" ("guild_sf") `);
        await queryRunner.query(`CREATE INDEX "IDX_4f9302cff43aa2af13816fa5a5" ON "app"."ticket" ("crew_channel_sf") `);
        await queryRunner.query(`CREATE INDEX "IDX_5a8a2f5e5726a244c8da029add" ON "app"."ticket" ("content") `);
        await queryRunner.query(`CREATE TYPE "app"."crew_member_access_enum" AS ENUM('0', '1', '10', '100')`);
        await queryRunner.query(`CREATE TABLE "app"."crew_member" ("member_sf" bigint NOT NULL, "guild_sf" bigint NOT NULL, "name" character varying NOT NULL, "icon" character varying, "access" "app"."crew_member_access_enum" NOT NULL DEFAULT '10', "crew_channel_sf" bigint NOT NULL, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_65d035e4885d5203c8e1916edb3" PRIMARY KEY ("member_sf", "crew_channel_sf"))`);
        await queryRunner.query(`CREATE INDEX "IDX_bb5bd460651bb3a32097fefca1" ON "app"."crew_member" ("guild_sf") `);
        await queryRunner.query(`CREATE TABLE "app"."crew" ("crew_channel_sf" bigint NOT NULL, "guild_sf" bigint NOT NULL, "name" character varying NOT NULL, "name_short" character varying NOT NULL, "slug" character varying NOT NULL, "role_sf" bigint NOT NULL, "enable_move_prompt" boolean NOT NULL DEFAULT false, "forum_channel_sf" bigint NOT NULL, "created_by_sf" bigint NOT NULL, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "unique_short_name" UNIQUE ("guild_sf", "name_short"), CONSTRAINT "PK_442b04bec1b05539a359fd2255f" PRIMARY KEY ("crew_channel_sf"))`);
        await queryRunner.query(`CREATE INDEX "IDX_0bb46e1f423e8f8411ca735232" ON "app"."crew" ("guild_sf") `);
        await queryRunner.query(`CREATE INDEX "IDX_9432db7e42fe6079bba73d5c90" ON "app"."crew" ("role_sf") `);
        await queryRunner.query(`CREATE INDEX "IDX_cd369dcee37a1a71a622b28d30" ON "app"."crew" ("forum_channel_sf") `);
        await queryRunner.query(`CREATE TABLE "app"."tag_template" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "name" character varying NOT NULL, "moderated" boolean NOT NULL DEFAULT false, "default" boolean NOT NULL DEFAULT false, "guild_sf" bigint NOT NULL, "crew_channel_sf" bigint, "created_by_sf" bigint NOT NULL, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "unique_tag_name" UNIQUE ("guild_sf", "name"), CONSTRAINT "PK_b7b5b1f70703654a5cae0387141" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_6ffe4ddca13d3a3f6a2eeb56e9" ON "app"."tag_template" ("guild_sf") `);
        await queryRunner.query(`CREATE INDEX "IDX_6dd272625cd80c46228dea3aac" ON "app"."tag_template" ("crew_channel_sf") `);
        await queryRunner.query(`CREATE INDEX "IDX_716c603ee69bf32db39ad722ce" ON "app"."tag_template" ("created_by_sf") `);
        await queryRunner.query(`CREATE TABLE "app"."tag" ("tag_sf" bigint NOT NULL, "name" character varying NOT NULL, "guild_sf" bigint NOT NULL, "forum_channel_sf" bigint NOT NULL, "template_id" uuid NOT NULL, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "unique_forum_tag_template" UNIQUE ("template_id", "forum_channel_sf"), CONSTRAINT "PK_2659bcb506d7941d1f32cabdd9a" PRIMARY KEY ("tag_sf"))`);
        await queryRunner.query(`CREATE INDEX "IDX_c8e993237432d7e6c86e08207c" ON "app"."tag" ("guild_sf") `);
        await queryRunner.query(`CREATE INDEX "IDX_0c1b1b57c8c7efab417cd79ede" ON "app"."tag" ("forum_channel_sf") `);
        await queryRunner.query(`CREATE INDEX "IDX_b7b5b1f70703654a5cae038714" ON "app"."tag" ("template_id") `);
        await queryRunner.query(`CREATE TABLE "app"."team" ("category_channel_sf" bigint NOT NULL, "name" character varying NOT NULL, "guild_sf" bigint NOT NULL, "role_sf" bigint NOT NULL, "forum_channel_sf" bigint NOT NULL, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_f11c297eff99ae2ba5d54a2b50e" PRIMARY KEY ("category_channel_sf"))`);
        await queryRunner.query(`CREATE INDEX "IDX_f11c297eff99ae2ba5d54a2b50" ON "app"."team" ("category_channel_sf") `);
        await queryRunner.query(`CREATE INDEX "IDX_cf461f5b40cf1a2b8876011e1e" ON "app"."team" ("name") `);
        await queryRunner.query(`CREATE INDEX "IDX_12ad0146455a9b5454397d13e9" ON "app"."team" ("guild_sf") `);
        await queryRunner.query(`CREATE INDEX "IDX_e10f1a1f97724f4c44808559e3" ON "app"."team" ("role_sf") `);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_1b67bc292db3db7f77f79bfa65" ON "app"."team" ("forum_channel_sf") `);
        await queryRunner.query(`ALTER TABLE "app"."ticket" ADD CONSTRAINT "FK_4f9302cff43aa2af13816fa5a5b" FOREIGN KEY ("crew_channel_sf") REFERENCES "app"."crew"("crew_channel_sf") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "app"."crew_member" ADD CONSTRAINT "FK_20443a697b6cc975b2ad14a70d8" FOREIGN KEY ("crew_channel_sf") REFERENCES "app"."crew"("crew_channel_sf") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "app"."crew" ADD CONSTRAINT "FK_cd369dcee37a1a71a622b28d306" FOREIGN KEY ("forum_channel_sf") REFERENCES "app"."team"("forum_channel_sf") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "app"."tag_template" ADD CONSTRAINT "FK_6dd272625cd80c46228dea3aacd" FOREIGN KEY ("crew_channel_sf") REFERENCES "app"."crew"("crew_channel_sf") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "app"."tag" ADD CONSTRAINT "FK_0c1b1b57c8c7efab417cd79ede1" FOREIGN KEY ("forum_channel_sf") REFERENCES "app"."team"("forum_channel_sf") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "app"."tag" ADD CONSTRAINT "FK_b7b5b1f70703654a5cae0387141" FOREIGN KEY ("template_id") REFERENCES "app"."tag_template"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "app"."tag" DROP CONSTRAINT "FK_b7b5b1f70703654a5cae0387141"`);
        await queryRunner.query(`ALTER TABLE "app"."tag" DROP CONSTRAINT "FK_0c1b1b57c8c7efab417cd79ede1"`);
        await queryRunner.query(`ALTER TABLE "app"."tag_template" DROP CONSTRAINT "FK_6dd272625cd80c46228dea3aacd"`);
        await queryRunner.query(`ALTER TABLE "app"."crew" DROP CONSTRAINT "FK_cd369dcee37a1a71a622b28d306"`);
        await queryRunner.query(`ALTER TABLE "app"."crew_member" DROP CONSTRAINT "FK_20443a697b6cc975b2ad14a70d8"`);
        await queryRunner.query(`ALTER TABLE "app"."ticket" DROP CONSTRAINT "FK_4f9302cff43aa2af13816fa5a5b"`);
        await queryRunner.query(`DROP INDEX "app"."IDX_1b67bc292db3db7f77f79bfa65"`);
        await queryRunner.query(`DROP INDEX "app"."IDX_e10f1a1f97724f4c44808559e3"`);
        await queryRunner.query(`DROP INDEX "app"."IDX_12ad0146455a9b5454397d13e9"`);
        await queryRunner.query(`DROP INDEX "app"."IDX_cf461f5b40cf1a2b8876011e1e"`);
        await queryRunner.query(`DROP INDEX "app"."IDX_f11c297eff99ae2ba5d54a2b50"`);
        await queryRunner.query(`DROP TABLE "app"."team"`);
        await queryRunner.query(`DROP INDEX "app"."IDX_b7b5b1f70703654a5cae038714"`);
        await queryRunner.query(`DROP INDEX "app"."IDX_0c1b1b57c8c7efab417cd79ede"`);
        await queryRunner.query(`DROP INDEX "app"."IDX_c8e993237432d7e6c86e08207c"`);
        await queryRunner.query(`DROP TABLE "app"."tag"`);
        await queryRunner.query(`DROP INDEX "app"."IDX_716c603ee69bf32db39ad722ce"`);
        await queryRunner.query(`DROP INDEX "app"."IDX_6dd272625cd80c46228dea3aac"`);
        await queryRunner.query(`DROP INDEX "app"."IDX_6ffe4ddca13d3a3f6a2eeb56e9"`);
        await queryRunner.query(`DROP TABLE "app"."tag_template"`);
        await queryRunner.query(`DROP INDEX "app"."IDX_cd369dcee37a1a71a622b28d30"`);
        await queryRunner.query(`DROP INDEX "app"."IDX_9432db7e42fe6079bba73d5c90"`);
        await queryRunner.query(`DROP INDEX "app"."IDX_0bb46e1f423e8f8411ca735232"`);
        await queryRunner.query(`DROP TABLE "app"."crew"`);
        await queryRunner.query(`DROP INDEX "app"."IDX_bb5bd460651bb3a32097fefca1"`);
        await queryRunner.query(`DROP TABLE "app"."crew_member"`);
        await queryRunner.query(`DROP TYPE "app"."crew_member_access_enum"`);
        await queryRunner.query(`DROP INDEX "app"."IDX_5a8a2f5e5726a244c8da029add"`);
        await queryRunner.query(`DROP INDEX "app"."IDX_4f9302cff43aa2af13816fa5a5"`);
        await queryRunner.query(`DROP INDEX "app"."IDX_a319b4040bfb996e9d5361b107"`);
        await queryRunner.query(`DROP TABLE "app"."ticket"`);
    }

}
