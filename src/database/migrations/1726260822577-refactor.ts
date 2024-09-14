import { MigrationInterface, QueryRunner } from 'typeorm';

export class Refactor1726260822577 implements MigrationInterface {
  name = 'Refactor1726260822577';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "app"."tag_template" DROP CONSTRAINT "FK_6dd272625cd80c46228dea3aacd"`,
    );
    await queryRunner.query(
      `ALTER TABLE "app"."ticket" DROP CONSTRAINT "FK_4f9302cff43aa2af13816fa5a5b"`,
    );
    await queryRunner.query(
      `ALTER TABLE "app"."crew_member" DROP CONSTRAINT "FK_20443a697b6cc975b2ad14a70d8"`,
    );
    await queryRunner.query(
      `ALTER TABLE "app"."crew_log" DROP CONSTRAINT "FK_ec43595a7f5ff57a09731e47342"`,
    );
    await queryRunner.query(
      `ALTER TABLE "app"."crew" DROP CONSTRAINT "FK_cd369dcee37a1a71a622b28d306"`,
    );
    await queryRunner.query(
      `ALTER TABLE "app"."crew_share" DROP CONSTRAINT "FK_8b25647de2a9b3627002dd062ed"`,
    );
    await queryRunner.query(
      `ALTER TABLE "app"."crew_share" DROP CONSTRAINT "FK_db9e3c836f7d17c1901d1947ad8"`,
    );
    await queryRunner.query(
      `ALTER TABLE "app"."tag" DROP CONSTRAINT "FK_0c1b1b57c8c7efab417cd79ede1"`,
    );
    await queryRunner.query(
      `ALTER TABLE "app"."tag" DROP CONSTRAINT "FK_b7b5b1f70703654a5cae0387141"`,
    );
    await queryRunner.query(`DROP INDEX "app"."IDX_6dd272625cd80c46228dea3aac"`);
    await queryRunner.query(`DROP INDEX "app"."IDX_6ffe4ddca13d3a3f6a2eeb56e9"`);
    await queryRunner.query(`DROP INDEX "app"."IDX_716c603ee69bf32db39ad722ce"`);
    await queryRunner.query(`DROP INDEX "app"."IDX_4f9302cff43aa2af13816fa5a5"`);
    await queryRunner.query(`DROP INDEX "app"."IDX_5a8a2f5e5726a244c8da029add"`);
    await queryRunner.query(`DROP INDEX "app"."IDX_a319b4040bfb996e9d5361b107"`);
    await queryRunner.query(`DROP INDEX "app"."IDX_bb5bd460651bb3a32097fefca1"`);
    await queryRunner.query(`DROP INDEX "app"."crew_member_unique"`);
    await queryRunner.query(`DROP INDEX "app"."IDX_5f861e5ca69d62ef9b257255c1"`);
    await queryRunner.query(`DROP INDEX "app"."IDX_a6c9430a774b5080281e7e8d57"`);
    await queryRunner.query(`DROP INDEX "app"."IDX_ec43595a7f5ff57a09731e4734"`);
    await queryRunner.query(`DROP INDEX "app"."IDX_0bb46e1f423e8f8411ca735232"`);
    await queryRunner.query(`DROP INDEX "app"."IDX_9432db7e42fe6079bba73d5c90"`);
    await queryRunner.query(`DROP INDEX "app"."IDX_cd369dcee37a1a71a622b28d30"`);
    await queryRunner.query(`DROP INDEX "app"."crew_share_unique"`);
    await queryRunner.query(`DROP INDEX "app"."IDX_0c1b1b57c8c7efab417cd79ede"`);
    await queryRunner.query(`DROP INDEX "app"."IDX_b7b5b1f70703654a5cae038714"`);
    await queryRunner.query(`DROP INDEX "app"."IDX_c8e993237432d7e6c86e08207c"`);
    await queryRunner.query(`DROP INDEX "app"."IDX_12ad0146455a9b5454397d13e9"`);
    await queryRunner.query(`DROP INDEX "app"."IDX_1b67bc292db3db7f77f79bfa65"`);
    await queryRunner.query(`DROP INDEX "app"."IDX_534486bcedafa6d660e17fce5c"`);
    await queryRunner.query(`DROP INDEX "app"."IDX_cf461f5b40cf1a2b8876011e1e"`);
    await queryRunner.query(`DROP INDEX "app"."IDX_e10f1a1f97724f4c44808559e3"`);
    await queryRunner.query(`DROP INDEX "app"."IDX_f11c297eff99ae2ba5d54a2b50"`);
    await queryRunner.query(`ALTER TABLE "app"."tag_template" DROP CONSTRAINT "unique_tag_name"`);
    await queryRunner.query(`ALTER TABLE "app"."crew" DROP CONSTRAINT "unique_crew_tag_name"`);
    await queryRunner.query(`ALTER TABLE "app"."tag" DROP CONSTRAINT "unique_forum_tag_template"`);
    ///
    await queryRunner.query(`ALTER TABLE "app"."guild" ADD "id" uuid NOT NULL DEFAULT uuidv7()`);
    await queryRunner.query(
      `ALTER TABLE "app"."guild" DROP CONSTRAINT "PK_5922781211eba05d9f86f969faf"`,
    );
    await queryRunner.query(
      `ALTER TABLE "app"."guild" ADD CONSTRAINT "PK_4b8f28a02e6053dde76dda222b1" PRIMARY KEY ("id")`,
    );
    await queryRunner.query(`ALTER TABLE "app"."guild" RENAME COLUMN "name_short" TO "short_name"`);
    await queryRunner.query(`ALTER TABLE "app"."guild" ADD "config" jsonb NOT NULL DEFAULT '{}'`);
    await queryRunner.query(`ALTER TABLE "app"."guild" ADD "deleted_at" TIMESTAMP WITH TIME ZONE`);
    ///
    await queryRunner.query(
      `ALTER TABLE "app"."tag_template" DROP CONSTRAINT "PK_b7b5b1f70703654a5cae0387141"`,
    );
    await queryRunner.query(`ALTER TABLE "app"."tag_template" RENAME COLUMN "id" TO "old_id"`);
    await queryRunner.query(
      `ALTER TABLE "app"."tag_template" ADD "id" uuid NOT NULL DEFAULT uuidv7()`,
    );
    await queryRunner.query(
      `ALTER TABLE "app"."tag_template" ADD CONSTRAINT "pk_tag_template_id" PRIMARY KEY ("id")`,
    );
    await queryRunner.query(`ALTER TABLE "app"."tag_template" ADD "guild_id" uuid`);
    await queryRunner.query(`ALTER TABLE "app"."tag_template" ADD "emoji" character varying`);
    await queryRunner.query(
      `COMMENT ON COLUMN "app"."tag_template"."moderated" IS 'Is adding or removing this tag on posts restricted?'`,
    );
    await queryRunner.query(
      `COMMENT ON COLUMN "app"."tag_template"."default" IS 'Is the tag applied automatically?'`,
    );
    await queryRunner.query(
      `COMMENT ON COLUMN "app"."tag_template"."crew_channel_sf" IS 'Crew for which the tag was created, to identify tickets for a specific crew.'`,
    );
    await queryRunner.query(`
        UPDATE "app"."tag_template" template SET guild_id=g.id
        FROM (
            SELECT guild.id id, template.guild_sf
            FROM "app"."tag_template" template
            LEFT JOIN "app"."guild" guild ON guild.guild_sf=template.guild_sf
        ) g
        WHERE g.guild_sf=template.guild_sf
    `);
    await queryRunner.query(
      `ALTER TABLE "app"."tag_template" ALTER COLUMN "guild_id" SET NOT NULL`,
    );
    await queryRunner.query(`ALTER TABLE "app"."tag_template" DROP COLUMN "guild_sf"`);
    ///
    await queryRunner.query(`ALTER TABLE "app"."team" ADD "id" uuid NOT NULL DEFAULT uuidv7()`);
    await queryRunner.query(
      `ALTER TABLE "app"."team" DROP CONSTRAINT "PK_f11c297eff99ae2ba5d54a2b50e"`,
    );
    await queryRunner.query(
      `ALTER TABLE "app"."team" ADD CONSTRAINT "PK_5318026c23a9060d322952e7667" PRIMARY KEY ("id")`,
    );
    await queryRunner.query(`ALTER TABLE "app"."team" ADD "guild_id" uuid`);
    await queryRunner.query(`
        UPDATE "app"."team" team SET guild_id=g.id
        FROM (
            SELECT guild.id id, team.guild_sf
            FROM "app"."team" team
            LEFT JOIN "app"."guild" guild ON guild.guild_sf=team.guild_sf
        ) g
        WHERE g.guild_sf=team.guild_sf
    `);
    await queryRunner.query(`ALTER TABLE "app"."team" ALTER COLUMN "guild_id" SET NOT NULL`);
    await queryRunner.query(`ALTER TABLE "app"."team" ADD "deleted_at" TIMESTAMP WITH TIME ZONE`);
    await queryRunner.query(`ALTER TABLE "app"."team" DROP COLUMN "guild_sf"`);
    await queryRunner.query(`ALTER TABLE "app"."team" DROP COLUMN "role_sf"`);
    await queryRunner.query(`ALTER TABLE "app"."team" DROP COLUMN "audit_channel_sf"`);
    ///
    await queryRunner.query(`ALTER TABLE "app"."crew" RENAME COLUMN "permanent" TO "is_permanent"`);
    await queryRunner.query(
      `COMMENT ON COLUMN "app"."crew"."is_permanent" IS 'Crew will not be archived during a purge'`,
    );
    await queryRunner.query(
      `ALTER TABLE "app"."crew" ADD "secure_only" boolean NOT NULL DEFAULT true`,
    );
    await queryRunner.query(
      `COMMENT ON COLUMN "app"."crew"."secure_only" IS 'Crew information to be displayed only in private channels'`,
    );
    await queryRunner.query(`ALTER TABLE "app"."crew" ADD "deleted_by_sf" bigint`);
    await queryRunner.query(`ALTER TABLE "app"."crew" ADD "voice_channel_sf" bigint`);
    await queryRunner.query(`ALTER TABLE "app"."crew" ADD "guild_id" uuid`);
    await queryRunner.query(`
        UPDATE "app"."crew" crew SET guild_id=g.id
        FROM (
            SELECT guild.id id, crew.guild_sf
            FROM "app"."crew" crew
            LEFT JOIN "app"."guild" guild ON guild.guild_sf=crew.guild_sf
        ) g
        WHERE g.guild_sf=crew.guild_sf
    `);
    await queryRunner.query(`ALTER TABLE "app"."crew" ALTER COLUMN "guild_id" SET NOT NULL`);
    await queryRunner.query(`ALTER TABLE "app"."crew" ADD "team_id" uuid`);
    await queryRunner.query(`
        UPDATE "app"."crew" crew SET team_id=t.id
        FROM (
            SELECT team.id id, crew.forum_channel_sf
            FROM "app"."crew" crew
            LEFT JOIN "app"."team" team ON team.forum_channel_sf=crew.forum_channel_sf
        ) t
        WHERE t.forum_channel_sf=crew.forum_channel_sf
    `);
    await queryRunner.query(`ALTER TABLE "app"."crew" ALTER COLUMN "team_id" SET NOT NULL`);
    await queryRunner.query(`ALTER TABLE "app"."crew" ADD "audit_message_sf" bigint`);
    await queryRunner.query(`ALTER TABLE "app"."crew" DROP COLUMN "guild_sf"`);
    await queryRunner.query(`ALTER TABLE "app"."crew" DROP COLUMN "forum_channel_sf"`);
    await queryRunner.query(
      `COMMENT ON COLUMN "app"."crew"."enable_move_prompt" IS 'Tickets for this crew will display the move dialog by default'`,
    );
    ///
    await queryRunner.query(`ALTER TABLE "app"."crew_share" ADD "target_guild_id" uuid`);
    await queryRunner.query(`
        UPDATE "app"."crew_share" share SET target_guild_id=g.id
        FROM (
            SELECT guild.id id, share.target_guild_sf
            FROM "app"."crew_share" share
            LEFT JOIN "app"."guild" guild ON guild.guild_sf=share.target_guild_sf
        ) g
        WHERE g.target_guild_sf=share.target_guild_sf
    `);
    await queryRunner.query(`ALTER TABLE "app"."crew_share" DROP COLUMN "target_guild_sf"`);
    await queryRunner.query(
      `ALTER TABLE "app"."crew_share" ALTER COLUMN "target_guild_id" SET NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "app"."crew_share" ADD CONSTRAINT "PK_ad4a7d78f92f28c24b6e0461e32" PRIMARY KEY ("crew_channel_sf", "target_guild_id")`,
    );
    ///
    await queryRunner.query(
      `ALTER TABLE "app"."crew_member" ADD "id" uuid NOT NULL DEFAULT uuidv7()`,
    );
    await queryRunner.query(
      `ALTER TABLE "app"."crew_member" DROP CONSTRAINT "PK_65d035e4885d5203c8e1916edb3"`,
    );
    await queryRunner.query(
      `ALTER TABLE "app"."crew_member" ADD CONSTRAINT "PK_297e98e2ff6fea7bd765f2ac0c2" PRIMARY KEY ("member_sf", "crew_channel_sf", "id")`,
    );
    await queryRunner.query(`ALTER TABLE "app"."crew_member" ADD "guild_id" uuid`);
    await queryRunner.query(
      `ALTER TABLE "app"."crew_member" ADD "deleted_at" TIMESTAMP WITH TIME ZONE`,
    );
    await queryRunner.query(`
        UPDATE "app"."crew_member" member SET guild_id=g.id
        FROM (
            SELECT guild.id id, member.guild_sf
            FROM "app"."crew_member" member
            LEFT JOIN "app"."guild" guild ON guild.guild_sf=member.guild_sf
        ) g
        WHERE g.guild_sf=member.guild_sf
    `);
    await queryRunner.query(`ALTER TABLE "app"."crew_member" ALTER COLUMN "guild_id" SET NOT NULL`);
    await queryRunner.query(`ALTER TABLE "app"."crew_member" DROP COLUMN "guild_sf"`);
    await queryRunner.query(`ALTER TABLE "app"."crew_member" DROP COLUMN "icon"`);
    ///
    await queryRunner.query(
      `ALTER TABLE "app"."crew_log" DROP CONSTRAINT "PK_23c06a4ac2074609bdb1ac9a5e6"`,
    );
    await queryRunner.query(`ALTER TABLE "app"."crew_log" ADD "id" uuid NOT NULL DEFAULT uuidv7()`);
    await queryRunner.query(
      `ALTER TABLE "app"."crew_log" ADD CONSTRAINT "pk_crew_log_id" PRIMARY KEY ("id")`,
    );
    await queryRunner.query(
      `ALTER TABLE "app"."crew_log" RENAME COLUMN "thread_sf" TO "message_sf"`,
    );
    await queryRunner.query(`ALTER TABLE "app"."crew_log" ADD "guild_id" uuid`);
    await queryRunner.query(`
        UPDATE "app"."crew_log" log SET guild_id=g.id
        FROM (
            SELECT guild.id id, log.guild_sf
            FROM "app"."crew_log" log
            LEFT JOIN "app"."guild" guild ON guild.guild_sf=log.guild_sf
        ) g
        WHERE g.guild_sf=log.guild_sf
    `);
    await queryRunner.query(`ALTER TABLE "app"."crew_log" ALTER COLUMN "guild_id" SET NOT NULL`);
    await queryRunner.query(`ALTER TABLE "app"."crew_log" DROP COLUMN "guild_sf"`);
    ///
    await queryRunner.query(`ALTER TABLE "app"."tag" ADD "guild_id" uuid`);
    await queryRunner.query(`
        UPDATE "app"."tag" tag SET guild_id=g.id
        FROM (
            SELECT guild.id id, tag.guild_sf
            FROM "app"."tag" tag
            LEFT JOIN "app"."guild" guild ON guild.guild_sf=tag.guild_sf
        ) g
        WHERE g.guild_sf=tag.guild_sf
    `);
    await queryRunner.query(`ALTER TABLE "app"."tag" ALTER COLUMN "guild_id" SET NOT NULL`);
    await queryRunner.query(`ALTER TABLE "app"."tag" ADD "team_id" uuid`);
    await queryRunner.query(`
        UPDATE "app"."tag" tag SET team_id=t.id
        FROM (
            SELECT team.id id, tag.forum_channel_sf
            FROM "app"."tag" tag
            LEFT JOIN "app"."team" team ON team.forum_channel_sf=tag.forum_channel_sf
        ) t
        WHERE t.forum_channel_sf=tag.forum_channel_sf
    `);
    await queryRunner.query(`ALTER TABLE "app"."tag" ALTER COLUMN "team_id" SET NOT NULL`);
    await queryRunner.query(
      `ALTER TABLE "app"."tag" RENAME COLUMN "template_id" TO "tag_template_id"`,
    );
    await queryRunner.query(`
        UPDATE "app"."tag" tag SET tag_template_id=t.id
        FROM (
            SELECT template.id id, tag.tag_template_id
            FROM "app"."tag" tag
            LEFT JOIN "app"."tag_template" template ON template.old_id=tag.tag_template_id
        ) t
        WHERE t.tag_template_id=tag.tag_template_id
    `);
    await queryRunner.query(`ALTER TABLE "app"."tag" DROP COLUMN "guild_sf"`);
    await queryRunner.query(`ALTER TABLE "app"."tag" DROP COLUMN "forum_channel_sf"`);
    ///
    await queryRunner.query(`ALTER TABLE "app"."tag_template" DROP COLUMN "old_id"`);
    ///
    await queryRunner.query(`ALTER TABLE "app"."ticket" ADD "guild_id" uuid`);
    await queryRunner.query(`ALTER TABLE "app"."ticket" ADD "previous_thread_sf" bigint`);
    await queryRunner.query(
      `ALTER TABLE "app"."ticket" ADD "sort_order" character varying NOT NULL DEFAULT ''`,
    );
    await queryRunner.query(`
        UPDATE "app"."ticket" ticket SET guild_id=g.id
        FROM (
            SELECT guild.id id, ticket.guild_sf
            FROM "app"."ticket" ticket
            LEFT JOIN "app"."guild" guild ON guild.guild_sf=ticket.guild_sf
        ) g
        WHERE g.guild_sf=ticket.guild_sf
    `);
    await queryRunner.query(`ALTER TABLE "app"."ticket" ALTER COLUMN "guild_id" SET NOT NULL`);
    await queryRunner.query(`ALTER TABLE "app"."ticket" DROP COLUMN "guild_sf"`);
    ///
    await queryRunner.query(
      `ALTER TABLE "app"."crew_member" DROP CONSTRAINT "PK_297e98e2ff6fea7bd765f2ac0c2"`,
    );
    await queryRunner.query(
      `ALTER TABLE "app"."crew_member" ADD CONSTRAINT "pk_crew_member_id" PRIMARY KEY ("id")`,
    );
    await queryRunner.query(
      `ALTER TYPE "app"."crew_member_access_enum" RENAME TO "crew_member_access_enum_old"`,
    );
    await queryRunner.query(`CREATE TYPE "app"."crew_member_access_enum" AS ENUM('0', '1', '10')`);
    await queryRunner.query(`ALTER TABLE "app"."crew_member" ALTER COLUMN "access" DROP DEFAULT`);
    await queryRunner.query(
      `ALTER TABLE "app"."crew_member" ALTER COLUMN "access" TYPE "app"."crew_member_access_enum" USING "access"::"text"::"app"."crew_member_access_enum"`,
    );
    await queryRunner.query(
      `ALTER TABLE "app"."crew_member" ALTER COLUMN "access" SET DEFAULT '10'`,
    );
    await queryRunner.query(`DROP TYPE "app"."crew_member_access_enum_old"`);

    await queryRunner.query(
      `ALTER TABLE "app"."crew_share" DROP CONSTRAINT "PK_ad4a7d78f92f28c24b6e0461e32"`,
    );
    await queryRunner.query(
      `ALTER TABLE "app"."crew_share" ADD CONSTRAINT "PK_ad4a7d78f92f28c24b6e0461e32" PRIMARY KEY ("crew_channel_sf", "target_guild_id")`,
    );
    await queryRunner.query(
      `ALTER TABLE "app"."guild" DROP CONSTRAINT "PK_4b8f28a02e6053dde76dda222b1"`,
    );
    await queryRunner.query(
      `ALTER TABLE "app"."guild" ADD CONSTRAINT "pk_guild_id" PRIMARY KEY ("id")`,
    );
    await queryRunner.query(
      `COMMENT ON COLUMN "app"."team"."forum_channel_sf" IS 'Forum where crew tickets will be sent'`,
    );
    await queryRunner.query(
      `COMMENT ON COLUMN "app"."team"."category_channel_sf" IS 'Category where crew channels will be created'`,
    );
    await queryRunner.query(
      `ALTER TABLE "app"."team" DROP CONSTRAINT "PK_5318026c23a9060d322952e7667"`,
    );
    await queryRunner.query(
      `ALTER TABLE "app"."team" ADD CONSTRAINT "pk_team_id" PRIMARY KEY ("id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "guild_id_idx_tag_template" ON "app"."tag_template" ("guild_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "crew_channel_sf_idx_tag_template" ON "app"."tag_template" ("crew_channel_sf") `,
    );
    await queryRunner.query(`CREATE INDEX "guild_id_idx_ticket" ON "app"."ticket" ("guild_id") `);
    await queryRunner.query(
      `CREATE INDEX "previous_thread_sf_idx_ticket" ON "app"."ticket" ("previous_thread_sf") `,
    );
    await queryRunner.query(
      `CREATE INDEX "crew_channel_sf_idx_ticket" ON "app"."ticket" ("crew_channel_sf") `,
    );
    await queryRunner.query(
      `CREATE INDEX "sort_order_idx_ticket" ON "app"."ticket" ("sort_order") `,
    );
    await queryRunner.query(
      `CREATE INDEX "crew_channel_sf_idx_crew_member" ON "app"."crew_member" ("crew_channel_sf") `,
    );
    await queryRunner.query(
      `CREATE INDEX "member_sf_idx_crew_member" ON "app"."crew_member" ("member_sf") `,
    );
    await queryRunner.query(
      `CREATE INDEX "guild_id_idx_crew_member" ON "app"."crew_member" ("guild_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "message_sf_idx_crew_log" ON "app"."crew_log" ("message_sf") `,
    );
    await queryRunner.query(
      `CREATE INDEX "guild_id_idx_crew_log" ON "app"."crew_log" ("guild_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "crew_channel_sf_idx_crew_log" ON "app"."crew_log" ("crew_channel_sf") `,
    );
    await queryRunner.query(`CREATE INDEX "guild_id_idx_crew" ON "app"."crew" ("guild_id") `);
    await queryRunner.query(`CREATE INDEX "team_id_idx_crew" ON "app"."crew" ("team_id") `);
    await queryRunner.query(`CREATE INDEX "role_sf_idx_crew" ON "app"."crew" ("role_sf") `);
    await queryRunner.query(
      `CREATE INDEX "audit_message_sf_idx_crew" ON "app"."crew" ("audit_message_sf") `,
    );
    await queryRunner.query(`CREATE INDEX "guild_id_idx_tag" ON "app"."tag" ("guild_id") `);
    await queryRunner.query(`CREATE INDEX "team_id_idx_tag" ON "app"."tag" ("team_id") `);
    await queryRunner.query(
      `CREATE INDEX "tag_template_id_idx_tag" ON "app"."tag" ("tag_template_id") `,
    );
    await queryRunner.query(`CREATE INDEX "name_idx_team" ON "app"."team" ("name") `);
    await queryRunner.query(`CREATE INDEX "guild_id_idx_team" ON "app"."team" ("guild_id") `);
    await queryRunner.query(
      `CREATE INDEX "forum_channel_sf_idx_team" ON "app"."team" ("forum_channel_sf") `,
    );
    await queryRunner.query(
      `CREATE INDEX "category_channel_sf_idx_team" ON "app"."team" ("category_channel_sf") `,
    );
    await queryRunner.query(
      `ALTER TABLE "app"."tag_template" ADD CONSTRAINT "uk_guild_id_name" UNIQUE ("guild_id", "name")`,
    );
    await queryRunner.query(
      `ALTER TABLE "app"."crew_member" ADD CONSTRAINT "uk_crew_channel_member_deleted_at" UNIQUE NULLS NOT DISTINCT ("crew_channel_sf", "member_sf", "deleted_at")`,
    );
    await queryRunner.query(
      `ALTER TABLE "app"."crew" ADD CONSTRAINT "uk_guild_crew_deleted_at" UNIQUE NULLS NOT DISTINCT ("guild_id", "crew_channel_sf", "deleted_at")`,
    );
    await queryRunner.query(
      `ALTER TABLE "app"."crew" ADD CONSTRAINT "uk_guild_name_deleted_at" UNIQUE NULLS NOT DISTINCT ("guild_id", "name_short", "deleted_at")`,
    );
    await queryRunner.query(
      `ALTER TABLE "app"."crew_share" ADD CONSTRAINT "uk_share_target_guild_crew_deleted_at" UNIQUE NULLS NOT DISTINCT ("target_guild_id", "crew_channel_sf", "deleted_at")`,
    );
    await queryRunner.query(
      `ALTER TABLE "app"."guild" ADD CONSTRAINT "uk_guild_sf_deleted_at" UNIQUE NULLS NOT DISTINCT ("guild_sf", "deleted_at")`,
    );
    await queryRunner.query(
      `ALTER TABLE "app"."tag" ADD CONSTRAINT "uk_template_id_team_id" UNIQUE ("tag_template_id", "team_id")`,
    );
    await queryRunner.query(
      `ALTER TABLE "app"."team" ADD CONSTRAINT "uk_name_guild_id_team" UNIQUE NULLS NOT DISTINCT ("name", "guild_id", "deleted_at")`,
    );
    await queryRunner.query(
      `ALTER TABLE "app"."tag_template" ADD CONSTRAINT "fk_tag_template_guild_id" FOREIGN KEY ("guild_id") REFERENCES "app"."guild"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "app"."tag_template" ADD CONSTRAINT "fk_tag_template_crew_channel_sf" FOREIGN KEY ("crew_channel_sf") REFERENCES "app"."crew"("crew_channel_sf") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "app"."ticket" ADD CONSTRAINT "fk_ticket_guild_id" FOREIGN KEY ("guild_id") REFERENCES "app"."guild"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "app"."ticket" ADD CONSTRAINT "fk_ticket_previous_thread_sf" FOREIGN KEY ("previous_thread_sf") REFERENCES "app"."ticket"("thread_sf") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "app"."ticket" ADD CONSTRAINT "fk_ticket_crew_channel_sf" FOREIGN KEY ("crew_channel_sf") REFERENCES "app"."crew"("crew_channel_sf") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "app"."crew_member" ADD CONSTRAINT "fk_crew_member_crew_channel_sf" FOREIGN KEY ("crew_channel_sf") REFERENCES "app"."crew"("crew_channel_sf") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "app"."crew_member" ADD CONSTRAINT "fk_crew_member_guild_id" FOREIGN KEY ("guild_id") REFERENCES "app"."guild"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "app"."crew_log" ADD CONSTRAINT "fk_crew_log_guild_id" FOREIGN KEY ("guild_id") REFERENCES "app"."guild"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "app"."crew_log" ADD CONSTRAINT "fk_crew_log_crew_channel_sf" FOREIGN KEY ("crew_channel_sf") REFERENCES "app"."crew"("crew_channel_sf") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "app"."crew" ADD CONSTRAINT "fk_crew_guild_id" FOREIGN KEY ("guild_id") REFERENCES "app"."guild"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "app"."crew" ADD CONSTRAINT "fk_crew_team_id" FOREIGN KEY ("team_id") REFERENCES "app"."team"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "app"."crew_share" ADD CONSTRAINT "fk_crew_share_crew_channel_sf" FOREIGN KEY ("crew_channel_sf") REFERENCES "app"."crew"("crew_channel_sf") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "app"."crew_share" ADD CONSTRAINT "fk_crew_share_guild_id" FOREIGN KEY ("target_guild_id") REFERENCES "app"."guild"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "app"."tag" ADD CONSTRAINT "fk_tag_guild_id" FOREIGN KEY ("guild_id") REFERENCES "app"."guild"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "app"."tag" ADD CONSTRAINT "fk_tag_team_id" FOREIGN KEY ("team_id") REFERENCES "app"."team"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "app"."tag" ADD CONSTRAINT "fk_tag_tag_template_id" FOREIGN KEY ("tag_template_id") REFERENCES "app"."tag_template"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "app"."team" ADD CONSTRAINT "fk_team_guild_id" FOREIGN KEY ("guild_id") REFERENCES "app"."guild"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    throw new Error('This migration was one way. Please restore data from backup.');
  }
}
