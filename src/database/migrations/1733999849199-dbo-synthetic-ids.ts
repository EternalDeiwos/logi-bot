import { MigrationInterface, QueryRunner } from 'typeorm';

export class DboSyntheticIds1733999849199 implements MigrationInterface {
  name = 'DboSyntheticIds1733999849199';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DELETE FROM "app"."typeorm_metadata" WHERE "type" = $1 AND "name" = $2 AND "schema" = $3`,
      ['VIEW', 'stockpile_diff', 'app'],
    );
    await queryRunner.query(`DROP VIEW "app"."stockpile_diff"`);
    await queryRunner.query(
      `DELETE FROM "app"."typeorm_metadata" WHERE "type" = $1 AND "name" = $2 AND "schema" = $3`,
      ['VIEW', 'stockpile_entry_current', 'app'],
    );
    await queryRunner.query(`DROP VIEW "app"."stockpile_entry_current"`);

    /**
     * CREATE NEW SYNTHETIC IDS
     */
    await queryRunner.query(`ALTER TABLE "app"."crew" ADD "id" uuid NOT NULL DEFAULT uuidv7()`);
    await queryRunner.query(`ALTER TABLE "app"."ticket" ADD "id" uuid NOT NULL DEFAULT uuidv7()`);

    /**
     * BEGIN MIGRATION TO SYNTHETIC IDS
     */
    await queryRunner.query(
      `ALTER TABLE "app"."tag_template" DROP CONSTRAINT "fk_tag_template_crew_channel_sf"`,
    );
    await queryRunner.query(
      `ALTER TABLE "app"."ticket" DROP CONSTRAINT "fk_ticket_crew_channel_sf"`,
    );
    await queryRunner.query(
      `ALTER TABLE "app"."ticket" DROP CONSTRAINT "fk_ticket_previous_thread_sf"`,
    );
    await queryRunner.query(
      `ALTER TABLE "app"."crew_member" DROP CONSTRAINT "fk_crew_member_crew_channel_sf"`,
    );
    await queryRunner.query(
      `ALTER TABLE "app"."crew_log" DROP CONSTRAINT "fk_crew_log_crew_channel_sf"`,
    );
    await queryRunner.query(
      `ALTER TABLE "app"."crew_share" DROP CONSTRAINT "fk_crew_share_crew_channel_sf"`,
    );
    await queryRunner.query(
      `ALTER TABLE "app"."stockpile_log" DROP CONSTRAINT "fk_stockpile_log_crew_channel_sf"`,
    );
    // Migrate tag_template to use new crew id
    await queryRunner.query(`ALTER TABLE "app"."tag_template" ADD "crew_id" uuid`);
    await queryRunner.query(`
        UPDATE "app"."tag_template" template SET crew_id=c.id
        FROM (
            SELECT crew.id id, template.crew_channel_sf
            FROM "app"."tag_template" template
            LEFT JOIN "app"."crew" crew ON crew.crew_channel_sf=template.crew_channel_sf
        ) c
        WHERE c.crew_channel_sf=template.crew_channel_sf
    `);
    // ---

    await queryRunner.query(
      `COMMENT ON COLUMN "app"."tag_template"."crew_id" IS 'Crew for which the tag was created, to identify tickets for a specific crew.'`,
    );
    await queryRunner.query(
      `ALTER TABLE "app"."ticket" DROP CONSTRAINT "PK_aa58f013374aeeb4f6ccb07f7c9"`,
    );
    await queryRunner.query(
      `ALTER TABLE "app"."ticket" ADD CONSTRAINT "PK_e1768ae7d998a0b2ee30c958058" PRIMARY KEY ("thread_sf", "id")`,
    );
    // Migrate ticket to use new ticket id
    await queryRunner.query(`ALTER TABLE "app"."ticket" ADD "previous_ticket_id" uuid`);
    await queryRunner.query(`
        UPDATE "app"."ticket" ticket SET previous_ticket_id=t.id
        FROM (
            SELECT previous_ticket.id id, ticket.previous_thread_sf
            FROM "app"."ticket" ticket
            LEFT JOIN "app"."ticket" previous_ticket ON previous_ticket.thread_sf=ticket.previous_thread_sf
        ) t
        WHERE t.previous_thread_sf=ticket.previous_thread_sf
    `);
    // ---

    // Migrate ticket to use new crew id
    await queryRunner.query(`ALTER TABLE "app"."ticket" ADD "crew_id" uuid`);
    await queryRunner.query(`
        UPDATE "app"."ticket" ticket SET crew_id=c.id
        FROM (
            SELECT crew.id id, ticket.crew_channel_sf
            FROM "app"."ticket" ticket
            LEFT JOIN "app"."crew" crew ON crew.crew_channel_sf=ticket.crew_channel_sf
        ) c
        WHERE c.crew_channel_sf=ticket.crew_channel_sf
    `);
    await queryRunner.query(`ALTER TABLE "app"."ticket" ALTER COLUMN "crew_id" SET NOT NULL`);
    // ---

    await queryRunner.query(
      `ALTER TABLE "app"."ticket" ADD "processed_at" TIMESTAMP WITH TIME ZONE`,
    );
    await queryRunner.query(`UPDATE "app"."ticket" SET processed_at=now()`);
    // Migrate crew_member to use new crew id
    await queryRunner.query(`ALTER TABLE "app"."crew_member" ADD "crew_id" uuid`);
    await queryRunner.query(`
        UPDATE "app"."crew_member" member SET crew_id=c.id
        FROM (
            SELECT crew.id id, member.crew_channel_sf
            FROM "app"."crew_member" member
            LEFT JOIN "app"."crew" crew ON crew.crew_channel_sf=member.crew_channel_sf
        ) c
        WHERE c.crew_channel_sf=member.crew_channel_sf
    `);
    await queryRunner.query(`ALTER TABLE "app"."crew_member" ALTER COLUMN "crew_id" SET NOT NULL`);
    // ---

    // Migrate crew_member to use new crew id
    await queryRunner.query(`ALTER TABLE "app"."crew_log" ADD "crew_id" uuid`);
    await queryRunner.query(`
        UPDATE "app"."crew_log" log SET crew_id=c.id
        FROM (
            SELECT crew.id id, log.crew_channel_sf
            FROM "app"."crew_log" log
            LEFT JOIN "app"."crew" crew ON crew.crew_channel_sf=log.crew_channel_sf
        ) c
        WHERE c.crew_channel_sf=log.crew_channel_sf
    `);
    await queryRunner.query(`ALTER TABLE "app"."crew_log" ALTER COLUMN "crew_id" SET NOT NULL`);
    // ---

    await queryRunner.query(
      `ALTER TABLE "app"."crew" DROP CONSTRAINT "PK_442b04bec1b05539a359fd2255f"`,
    );
    await queryRunner.query(
      `ALTER TABLE "app"."crew" ADD CONSTRAINT "PK_744198c692ecba5f2da7d18c58b" PRIMARY KEY ("crew_channel_sf", "id")`,
    );
    await queryRunner.query(`ALTER TABLE "app"."crew" ADD "processed_at" TIMESTAMP WITH TIME ZONE`);
    await queryRunner.query(`UPDATE "app"."crew" SET processed_at=now()`);

    // Migrate crew_share to use new crew id
    await queryRunner.query(`ALTER TABLE "app"."crew_share" ADD "crew_id" uuid`);
    await queryRunner.query(`
        UPDATE "app"."crew_share" share SET crew_id=c.id
        FROM (
            SELECT crew.id id, share.crew_channel_sf
            FROM "app"."crew_share" share
            LEFT JOIN "app"."crew" crew ON crew.crew_channel_sf=share.crew_channel_sf
        ) c
        WHERE c.crew_channel_sf=share.crew_channel_sf
    `);
    await queryRunner.query(`ALTER TABLE "app"."crew_share" ALTER COLUMN "crew_id" SET NOT NULL`);
    // ---

    await queryRunner.query(
      `ALTER TABLE "app"."crew_share" DROP CONSTRAINT "PK_ad4a7d78f92f28c24b6e0461e32"`,
    );
    await queryRunner.query(
      `ALTER TABLE "app"."crew_share" ADD CONSTRAINT "PK_28b09d73c2c1af3dc9cf9d66d58" PRIMARY KEY ("crew_channel_sf", "target_guild_id", "crew_id")`,
    );
    // Migrate stockpile_log to use new crew id
    await queryRunner.query(`ALTER TABLE "app"."stockpile_log" ADD "crew_id" uuid`);
    await queryRunner.query(`
        UPDATE "app"."stockpile_log" log SET crew_id=c.id
        FROM (
            SELECT crew.id id, log.crew_channel_sf
            FROM "app"."stockpile_log" log
            LEFT JOIN "app"."crew" crew ON crew.crew_channel_sf=log.crew_channel_sf
        ) c
        WHERE c.crew_channel_sf=log.crew_channel_sf
    `);
    // ---

    await queryRunner.query(
      `ALTER TABLE "app"."crew_share" DROP CONSTRAINT "PK_28b09d73c2c1af3dc9cf9d66d58"`,
    );
    await queryRunner.query(
      `ALTER TABLE "app"."crew_share" ADD CONSTRAINT "PK_805f02d1dbb4c041be7069fc400" PRIMARY KEY ("crew_id", "target_guild_id")`,
    );
    await queryRunner.query(
      `ALTER TABLE "app"."ticket" DROP CONSTRAINT "PK_e1768ae7d998a0b2ee30c958058"`,
    );
    await queryRunner.query(
      `ALTER TABLE "app"."ticket" ADD CONSTRAINT "pk_ticket_id" PRIMARY KEY ("id")`,
    );
    await queryRunner.query(`ALTER TABLE "app"."crew" DROP CONSTRAINT "uk_guild_crew_deleted_at"`);
    await queryRunner.query(
      `ALTER TABLE "app"."crew" DROP CONSTRAINT "PK_744198c692ecba5f2da7d18c58b"`,
    );
    await queryRunner.query(
      `ALTER TABLE "app"."crew" ADD CONSTRAINT "pk_crew_id" PRIMARY KEY ("id")`,
    );
    await queryRunner.query(
      `ALTER TABLE "app"."crew_share" DROP CONSTRAINT "uk_share_target_guild_crew_deleted_at"`,
    );
    await queryRunner.query(
      `CREATE INDEX "crew_id_idx_tag_template" ON "app"."tag_template" ("crew_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "previous_ticket_id_idx_ticket" ON "app"."ticket" ("previous_ticket_id") `,
    );
    await queryRunner.query(`CREATE INDEX "crew_id_idx_ticket" ON "app"."ticket" ("crew_id") `);
    await queryRunner.query(
      `CREATE INDEX "crew_id_idx_crew_member" ON "app"."crew_member" ("crew_id") `,
    );
    await queryRunner.query(`CREATE INDEX "crew_id_idx_crew_log" ON "app"."crew_log" ("crew_id") `);
    await queryRunner.query(
      `CREATE INDEX "crew_id_idx_stockpile_log" ON "app"."stockpile_log" ("crew_id") `,
    );
    await queryRunner.query(
      `ALTER TABLE "app"."crew" ADD CONSTRAINT "uk_guild_crew_deleted_at" UNIQUE NULLS NOT DISTINCT ("guild_id", "crew_channel_sf", "deleted_at")`,
    );
    await queryRunner.query(
      `ALTER TABLE "app"."crew_share" ADD CONSTRAINT "uk_share_target_guild_crew_deleted_at" UNIQUE NULLS NOT DISTINCT ("target_guild_id", "crew_id", "deleted_at")`,
    );
    await queryRunner.query(
      `ALTER TABLE "app"."tag_template" ADD CONSTRAINT "fk_tag_template_crew_id" FOREIGN KEY ("crew_id") REFERENCES "app"."crew"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "app"."ticket" ADD CONSTRAINT "fk_ticket_previous_ticket_id" FOREIGN KEY ("previous_ticket_id") REFERENCES "app"."ticket"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "app"."ticket" ADD CONSTRAINT "fk_ticket_crew_id" FOREIGN KEY ("crew_id") REFERENCES "app"."crew"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "app"."crew_member" ADD CONSTRAINT "fk_crew_member_crew_id" FOREIGN KEY ("crew_id") REFERENCES "app"."crew"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "app"."crew_log" ADD CONSTRAINT "fk_crew_log_crew_id" FOREIGN KEY ("crew_id") REFERENCES "app"."crew"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "app"."crew_share" ADD CONSTRAINT "fk_crew_share_crew_id" FOREIGN KEY ("crew_id") REFERENCES "app"."crew"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "app"."stockpile_log" ADD CONSTRAINT "fk_stockpile_log_crew_id" FOREIGN KEY ("crew_id") REFERENCES "app"."crew"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(`CREATE VIEW "app"."stockpile_diff" AS 
    SELECT
      entry1.id current_entry_id,
      entry2.id previous_entry_id,
      history.current_log_id,
      history.previous_log_id,
      history.stockpile_id,
      entry1.catalog_id,
      entry1.guild_id,
      entry1.war_number,
      entry1.quantity_crated,
      entry1.quantity_shippable,
      entry1.quantity_uncrated,
      history.created_at,
      entry1.created_by_sf,
      history.since_previous,
      COALESCE(entry1.quantity_crated - entry2.quantity_crated, entry1.quantity_crated) as diff_crated,
      COALESCE(entry1.quantity_shippable - entry2.quantity_shippable, entry1.quantity_shippable) as diff_shippable,
      COALESCE(entry1.quantity_uncrated - entry2.quantity_uncrated, entry1.quantity_uncrated) as diff_uncrated
    FROM
      (
        SELECT
          h1.stockpile_id stockpile_id,
          h1.log_id current_log_id,
          h2.log_id previous_log_id,
          h1.created_at created_at,
          COALESCE(h1.created_at - h2.created_at, '0'::interval) since_previous
        FROM app.stockpile_log_history h1,
        LATERAL (
          SELECT *
          FROM app.stockpile_log_history hh2
          WHERE hh2.rank=h1.rank+1 AND hh2.stockpile_id=h1.stockpile_id
        ) h2
      ) history
    LEFT JOIN app.stockpile_entry entry1 
      ON entry1.log_id=history.current_log_id 
      AND entry1.stockpile_id=history.stockpile_id
    LEFT JOIN app.stockpile_entry entry2 
      ON entry2.log_id=history.previous_log_id 
      AND entry1.catalog_id=entry2.catalog_id 
      AND entry1.stockpile_id=entry2.stockpile_id
  `);
    await queryRunner.query(
      `INSERT INTO "app"."typeorm_metadata"("database", "schema", "table", "type", "name", "value") VALUES (DEFAULT, $1, DEFAULT, $2, $3, $4)`,
      [
        'app',
        'VIEW',
        'stockpile_diff',
        "SELECT\n      entry1.id current_entry_id,\n      entry2.id previous_entry_id,\n      history.current_log_id,\n      history.previous_log_id,\n      history.stockpile_id,\n      entry1.catalog_id,\n      entry1.guild_id,\n      entry1.war_number,\n      entry1.quantity_crated,\n      entry1.quantity_shippable,\n      entry1.quantity_uncrated,\n      history.created_at,\n      entry1.created_by_sf,\n      history.since_previous,\n      COALESCE(entry1.quantity_crated - entry2.quantity_crated, entry1.quantity_crated) as diff_crated,\n      COALESCE(entry1.quantity_shippable - entry2.quantity_shippable, entry1.quantity_shippable) as diff_shippable,\n      COALESCE(entry1.quantity_uncrated - entry2.quantity_uncrated, entry1.quantity_uncrated) as diff_uncrated\n    FROM\n      (\n        SELECT\n          h1.stockpile_id stockpile_id,\n          h1.log_id current_log_id,\n          h2.log_id previous_log_id,\n          h1.created_at created_at,\n          COALESCE(h1.created_at - h2.created_at, '0'::interval) since_previous\n        FROM app.stockpile_log_history h1,\n        LATERAL (\n          SELECT *\n          FROM app.stockpile_log_history hh2\n          WHERE hh2.rank=h1.rank+1 AND hh2.stockpile_id=h1.stockpile_id\n        ) h2\n      ) history\n    LEFT JOIN app.stockpile_entry entry1 \n      ON entry1.log_id=history.current_log_id \n      AND entry1.stockpile_id=history.stockpile_id\n    LEFT JOIN app.stockpile_entry entry2 \n      ON entry2.log_id=history.previous_log_id \n      AND entry1.catalog_id=entry2.catalog_id \n      AND entry1.stockpile_id=entry2.stockpile_id",
      ],
    );
    await queryRunner.query(
      `CREATE VIEW "app"."stockpile_entry_current" AS SELECT DISTINCT ON ("entry"."stockpile_id", "entry"."catalog_id") "l"."id" AS "l_id", "l"."crew_channel_sf" AS "l_crew_channel_sf", "l"."crew_id" AS "l_crew_id", "l"."location_id" AS "l_location_id", "l"."war_number" AS "l_war_number", "l"."guild_id" AS "l_guild_id", "l"."message" AS "l_message", "l"."raw" AS "l_raw", "l"."processed_at" AS "l_processed_at", "l"."created_by_sf" AS "l_created_by_sf", "l"."created_at" AS "l_created_at", "l"."deleted_by_sf" AS "l_deleted_by_sf", "l"."deleted_at" AS "l_deleted_at", "c"."id" AS "c_id", "c"."foxhole_version" AS "c_foxhole_version", "c"."catalog_version" AS "c_catalog_version", "c"."code_name" AS "c_code_name", "c"."slang" AS "c_slang", "c"."display_name" AS "c_display_name", "c"."faction" AS "c_faction", "c"."category" AS "c_category", "c"."crate_quantity" AS "c_crate_quantity", "c"."shippable_quantity" AS "c_shippable_quantity", "c"."crate_stockpile_maximum" AS "c_crate_stockpile_maximum", "c"."shippable_stockpile_maximum" AS "c_shippable_stockpile_maximum", "c"."data" AS "c_data", "c"."created_at" AS "c_created_at", entry.* FROM "app"."stockpile_entry" "entry" LEFT JOIN "app"."stockpile_log" "l" ON "l"."id"="entry"."log_id"  LEFT JOIN "app"."catalog_expanded" "c" ON "c"."id"="entry"."catalog_id" WHERE "l"."deleted_at" IS NULL ORDER BY "entry"."stockpile_id" ASC, "entry"."catalog_id" ASC, "entry"."created_at" DESC`,
    );
    await queryRunner.query(
      `INSERT INTO "app"."typeorm_metadata"("database", "schema", "table", "type", "name", "value") VALUES (DEFAULT, $1, DEFAULT, $2, $3, $4)`,
      [
        'app',
        'VIEW',
        'stockpile_entry_current',
        'SELECT DISTINCT ON ("entry"."stockpile_id", "entry"."catalog_id") "l"."id" AS "l_id", "l"."crew_channel_sf" AS "l_crew_channel_sf", "l"."crew_id" AS "l_crew_id", "l"."location_id" AS "l_location_id", "l"."war_number" AS "l_war_number", "l"."guild_id" AS "l_guild_id", "l"."message" AS "l_message", "l"."raw" AS "l_raw", "l"."processed_at" AS "l_processed_at", "l"."created_by_sf" AS "l_created_by_sf", "l"."created_at" AS "l_created_at", "l"."deleted_by_sf" AS "l_deleted_by_sf", "l"."deleted_at" AS "l_deleted_at", "c"."id" AS "c_id", "c"."foxhole_version" AS "c_foxhole_version", "c"."catalog_version" AS "c_catalog_version", "c"."code_name" AS "c_code_name", "c"."slang" AS "c_slang", "c"."display_name" AS "c_display_name", "c"."faction" AS "c_faction", "c"."category" AS "c_category", "c"."crate_quantity" AS "c_crate_quantity", "c"."shippable_quantity" AS "c_shippable_quantity", "c"."crate_stockpile_maximum" AS "c_crate_stockpile_maximum", "c"."shippable_stockpile_maximum" AS "c_shippable_stockpile_maximum", "c"."data" AS "c_data", "c"."created_at" AS "c_created_at", entry.* FROM "app"."stockpile_entry" "entry" LEFT JOIN "app"."stockpile_log" "l" ON "l"."id"="entry"."log_id"  LEFT JOIN "app"."catalog_expanded" "c" ON "c"."id"="entry"."catalog_id" WHERE "l"."deleted_at" IS NULL ORDER BY "entry"."stockpile_id" ASC, "entry"."catalog_id" ASC, "entry"."created_at" DESC',
      ],
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DELETE FROM "app"."typeorm_metadata" WHERE "type" = $1 AND "name" = $2 AND "schema" = $3`,
      ['VIEW', 'stockpile_entry_current', 'app'],
    );
    await queryRunner.query(`DROP VIEW "app"."stockpile_entry_current"`);
    await queryRunner.query(
      `DELETE FROM "app"."typeorm_metadata" WHERE "type" = $1 AND "name" = $2 AND "schema" = $3`,
      ['VIEW', 'stockpile_diff', 'app'],
    );
    await queryRunner.query(`DROP VIEW "app"."stockpile_diff"`);
    await queryRunner.query(
      `ALTER TABLE "app"."stockpile_log" DROP CONSTRAINT "fk_stockpile_log_crew_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "app"."crew_share" DROP CONSTRAINT "fk_crew_share_crew_id"`,
    );
    await queryRunner.query(`ALTER TABLE "app"."crew_log" DROP CONSTRAINT "fk_crew_log_crew_id"`);
    await queryRunner.query(
      `ALTER TABLE "app"."crew_member" DROP CONSTRAINT "fk_crew_member_crew_id"`,
    );
    await queryRunner.query(`ALTER TABLE "app"."ticket" DROP CONSTRAINT "fk_ticket_crew_id"`);
    await queryRunner.query(
      `ALTER TABLE "app"."ticket" DROP CONSTRAINT "fk_ticket_previous_ticket_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "app"."tag_template" DROP CONSTRAINT "fk_tag_template_crew_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "app"."crew_share" DROP CONSTRAINT "uk_share_target_guild_crew_deleted_at"`,
    );
    await queryRunner.query(`ALTER TABLE "app"."crew" DROP CONSTRAINT "uk_guild_crew_deleted_at"`);
    await queryRunner.query(`DROP INDEX "app"."crew_id_idx_stockpile_log"`);
    await queryRunner.query(`DROP INDEX "app"."crew_id_idx_crew_log"`);
    await queryRunner.query(`DROP INDEX "app"."crew_id_idx_crew_member"`);
    await queryRunner.query(`DROP INDEX "app"."crew_id_idx_ticket"`);
    await queryRunner.query(`DROP INDEX "app"."previous_ticket_id_idx_ticket"`);
    await queryRunner.query(`DROP INDEX "app"."crew_id_idx_tag_template"`);
    await queryRunner.query(
      `ALTER TABLE "app"."crew_share" DROP CONSTRAINT "PK_805f02d1dbb4c041be7069fc400"`,
    );
    await queryRunner.query(
      `ALTER TABLE "app"."crew_share" ADD CONSTRAINT "PK_28b09d73c2c1af3dc9cf9d66d58" PRIMARY KEY ("crew_channel_sf", "target_guild_id", "crew_id")`,
    );
    await queryRunner.query(
      `ALTER TABLE "app"."crew_share" ADD CONSTRAINT "uk_share_target_guild_crew_deleted_at" UNIQUE NULLS NOT DISTINCT ("crew_channel_sf", "deleted_at", "target_guild_id")`,
    );
    await queryRunner.query(`ALTER TABLE "app"."crew" DROP CONSTRAINT "pk_crew_id"`);
    await queryRunner.query(
      `ALTER TABLE "app"."crew" ADD CONSTRAINT "PK_744198c692ecba5f2da7d18c58b" PRIMARY KEY ("crew_channel_sf", "id")`,
    );
    await queryRunner.query(
      `ALTER TABLE "app"."crew" ADD CONSTRAINT "uk_guild_crew_deleted_at" UNIQUE NULLS NOT DISTINCT ("crew_channel_sf", "deleted_at", "guild_id")`,
    );
    await queryRunner.query(`ALTER TABLE "app"."ticket" DROP CONSTRAINT "pk_ticket_id"`);
    await queryRunner.query(
      `ALTER TABLE "app"."ticket" ADD CONSTRAINT "PK_e1768ae7d998a0b2ee30c958058" PRIMARY KEY ("thread_sf", "id")`,
    );
    await queryRunner.query(`ALTER TABLE "app"."stockpile_log" DROP COLUMN "crew_id"`);
    await queryRunner.query(
      `ALTER TABLE "app"."crew_share" DROP CONSTRAINT "PK_28b09d73c2c1af3dc9cf9d66d58"`,
    );
    await queryRunner.query(
      `ALTER TABLE "app"."crew_share" ADD CONSTRAINT "PK_ad4a7d78f92f28c24b6e0461e32" PRIMARY KEY ("crew_channel_sf", "target_guild_id")`,
    );
    await queryRunner.query(`ALTER TABLE "app"."crew_share" DROP COLUMN "crew_id"`);
    await queryRunner.query(`ALTER TABLE "app"."crew" DROP COLUMN "processed_at"`);
    await queryRunner.query(
      `ALTER TABLE "app"."crew" DROP CONSTRAINT "PK_744198c692ecba5f2da7d18c58b"`,
    );
    await queryRunner.query(
      `ALTER TABLE "app"."crew" ADD CONSTRAINT "PK_442b04bec1b05539a359fd2255f" PRIMARY KEY ("crew_channel_sf")`,
    );
    await queryRunner.query(`ALTER TABLE "app"."crew" DROP COLUMN "id"`);
    await queryRunner.query(`ALTER TABLE "app"."crew_log" DROP COLUMN "crew_id"`);
    await queryRunner.query(`ALTER TABLE "app"."crew_member" DROP COLUMN "crew_id"`);
    await queryRunner.query(`ALTER TABLE "app"."ticket" DROP COLUMN "processed_at"`);
    await queryRunner.query(`ALTER TABLE "app"."ticket" DROP COLUMN "crew_id"`);
    await queryRunner.query(`ALTER TABLE "app"."ticket" DROP COLUMN "previous_ticket_id"`);
    await queryRunner.query(
      `ALTER TABLE "app"."ticket" DROP CONSTRAINT "PK_e1768ae7d998a0b2ee30c958058"`,
    );
    await queryRunner.query(
      `ALTER TABLE "app"."ticket" ADD CONSTRAINT "PK_aa58f013374aeeb4f6ccb07f7c9" PRIMARY KEY ("thread_sf")`,
    );
    await queryRunner.query(`ALTER TABLE "app"."ticket" DROP COLUMN "id"`);
    await queryRunner.query(
      `COMMENT ON COLUMN "app"."tag_template"."crew_id" IS 'Crew for which the tag was created, to identify tickets for a specific crew.'`,
    );
    await queryRunner.query(`ALTER TABLE "app"."tag_template" DROP COLUMN "crew_id"`);
    await queryRunner.query(
      `ALTER TABLE "app"."stockpile_log" ADD CONSTRAINT "fk_stockpile_log_crew_channel_sf" FOREIGN KEY ("crew_channel_sf") REFERENCES "app"."crew"("crew_channel_sf") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "app"."crew_share" ADD CONSTRAINT "fk_crew_share_crew_channel_sf" FOREIGN KEY ("crew_channel_sf") REFERENCES "app"."crew"("crew_channel_sf") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "app"."crew_log" ADD CONSTRAINT "fk_crew_log_crew_channel_sf" FOREIGN KEY ("crew_channel_sf") REFERENCES "app"."crew"("crew_channel_sf") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "app"."crew_member" ADD CONSTRAINT "fk_crew_member_crew_channel_sf" FOREIGN KEY ("crew_channel_sf") REFERENCES "app"."crew"("crew_channel_sf") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "app"."ticket" ADD CONSTRAINT "fk_ticket_previous_thread_sf" FOREIGN KEY ("previous_thread_sf") REFERENCES "app"."ticket"("thread_sf") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "app"."ticket" ADD CONSTRAINT "fk_ticket_crew_channel_sf" FOREIGN KEY ("crew_channel_sf") REFERENCES "app"."crew"("crew_channel_sf") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "app"."tag_template" ADD CONSTRAINT "fk_tag_template_crew_channel_sf" FOREIGN KEY ("crew_channel_sf") REFERENCES "app"."crew"("crew_channel_sf") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `CREATE VIEW "app"."stockpile_entry_current" AS SELECT DISTINCT ON ("entry"."stockpile_id", "entry"."catalog_id") "l"."id" AS "l_id", "l"."crew_channel_sf" AS "l_crew_channel_sf", "l"."location_id" AS "l_location_id", "l"."war_number" AS "l_war_number", "l"."guild_id" AS "l_guild_id", "l"."message" AS "l_message", "l"."raw" AS "l_raw", "l"."processed_at" AS "l_processed_at", "l"."created_by_sf" AS "l_created_by_sf", "l"."created_at" AS "l_created_at", "l"."deleted_by_sf" AS "l_deleted_by_sf", "l"."deleted_at" AS "l_deleted_at", "c"."id" AS "c_id", "c"."foxhole_version" AS "c_foxhole_version", "c"."catalog_version" AS "c_catalog_version", "c"."code_name" AS "c_code_name", "c"."slang" AS "c_slang", "c"."display_name" AS "c_display_name", "c"."faction" AS "c_faction", "c"."category" AS "c_category", "c"."crate_quantity" AS "c_crate_quantity", "c"."shippable_quantity" AS "c_shippable_quantity", "c"."crate_stockpile_maximum" AS "c_crate_stockpile_maximum", "c"."shippable_stockpile_maximum" AS "c_shippable_stockpile_maximum", "c"."data" AS "c_data", "c"."created_at" AS "c_created_at", entry.* FROM "app"."stockpile_entry" "entry" LEFT JOIN "app"."stockpile_log" "l" ON "l"."id"="entry"."log_id"  LEFT JOIN "app"."catalog_expanded" "c" ON "c"."id"="entry"."catalog_id" WHERE "l"."deleted_at" IS NULL ORDER BY "entry"."stockpile_id" ASC, "entry"."catalog_id" ASC, "entry"."created_at" DESC`,
    );
    await queryRunner.query(
      `INSERT INTO "app"."typeorm_metadata"("database", "schema", "table", "type", "name", "value") VALUES (DEFAULT, $1, DEFAULT, $2, $3, $4)`,
      [
        'app',
        'VIEW',
        'stockpile_entry_current',
        'SELECT DISTINCT ON ("entry"."stockpile_id", "entry"."catalog_id") "l"."id" AS "l_id", "l"."crew_channel_sf" AS "l_crew_channel_sf", "l"."location_id" AS "l_location_id", "l"."war_number" AS "l_war_number", "l"."guild_id" AS "l_guild_id", "l"."message" AS "l_message", "l"."raw" AS "l_raw", "l"."processed_at" AS "l_processed_at", "l"."created_by_sf" AS "l_created_by_sf", "l"."created_at" AS "l_created_at", "l"."deleted_by_sf" AS "l_deleted_by_sf", "l"."deleted_at" AS "l_deleted_at", "c"."id" AS "c_id", "c"."foxhole_version" AS "c_foxhole_version", "c"."catalog_version" AS "c_catalog_version", "c"."code_name" AS "c_code_name", "c"."slang" AS "c_slang", "c"."display_name" AS "c_display_name", "c"."faction" AS "c_faction", "c"."category" AS "c_category", "c"."crate_quantity" AS "c_crate_quantity", "c"."shippable_quantity" AS "c_shippable_quantity", "c"."crate_stockpile_maximum" AS "c_crate_stockpile_maximum", "c"."shippable_stockpile_maximum" AS "c_shippable_stockpile_maximum", "c"."data" AS "c_data", "c"."created_at" AS "c_created_at", entry.* FROM "app"."stockpile_entry" "entry" LEFT JOIN "app"."stockpile_log" "l" ON "l"."id"="entry"."log_id"  LEFT JOIN "app"."catalog_expanded" "c" ON "c"."id"="entry"."catalog_id" WHERE "l"."deleted_at" IS NULL ORDER BY "entry"."stockpile_id" ASC, "entry"."catalog_id" ASC, "entry"."created_at" DESC',
      ],
    );
    await queryRunner.query(
      `CREATE VIEW "app"."stockpile_diff" AS SELECT entry1.id current_entry_id, entry2.id previous_entry_id, history.current_log_id, history.previous_log_id, history.stockpile_id, entry1.catalog_id, entry1.guild_id, entry1.war_number, entry1.quantity_crated, entry1.quantity_shippable, entry1.quantity_uncrated, history.created_at, entry1.created_by_sf, history.since_previous, COALESCE(entry1.quantity_crated - entry2.quantity_crated, entry1.quantity_crated) as diff_crated, COALESCE(entry1.quantity_shippable - entry2.quantity_shippable, entry1.quantity_shippable) as diff_shippable, COALESCE(entry1.quantity_uncrated - entry2.quantity_uncrated, entry1.quantity_uncrated) as diff_uncrated FROM (SELECT h1.stockpile_id stockpile_id, h1.log_id current_log_id, h2.log_id previous_log_id, h1.created_at created_at, COALESCE(h1.created_at - h2.created_at, '0'::interval) since_previous   FROM app.stockpile_log_history h1, LATERAL (SELECT * FROM app.stockpile_log_history hh2 WHERE hh2.rank=h1.rank+1 AND hh2.stockpile_id=h1.stockpile_id) h2) history LEFT JOIN app.stockpile_entry entry1 ON entry1.log_id=history.current_log_id  AND entry1.stockpile_id=history.stockpile_id LEFT JOIN app.stockpile_entry entry2  ON entry2.log_id=history.previous_log_id AND entry1.catalog_id=entry2.catalog_id AND entry1.stockpile_id=entry2.stockpile_id`,
    );
    await queryRunner.query(
      `INSERT INTO "app"."typeorm_metadata"("database", "schema", "table", "type", "name", "value") VALUES (DEFAULT, $1, DEFAULT, $2, $3, $4)`,
      [
        'app',
        'VIEW',
        'stockpile_diff',
        "SELECT entry1.id current_entry_id, entry2.id previous_entry_id, history.current_log_id, history.previous_log_id, history.stockpile_id, entry1.catalog_id, entry1.guild_id, entry1.war_number, entry1.quantity_crated, entry1.quantity_shippable, entry1.quantity_uncrated, history.created_at, entry1.created_by_sf, history.since_previous, COALESCE(entry1.quantity_crated - entry2.quantity_crated, entry1.quantity_crated) as diff_crated, COALESCE(entry1.quantity_shippable - entry2.quantity_shippable, entry1.quantity_shippable) as diff_shippable, COALESCE(entry1.quantity_uncrated - entry2.quantity_uncrated, entry1.quantity_uncrated) as diff_uncrated FROM (SELECT h1.stockpile_id stockpile_id, h1.log_id current_log_id, h2.log_id previous_log_id, h1.created_at created_at, COALESCE(h1.created_at - h2.created_at, '0'::interval) since_previous   FROM app.stockpile_log_history h1, LATERAL (SELECT * FROM app.stockpile_log_history hh2 WHERE hh2.rank=h1.rank+1 AND hh2.stockpile_id=h1.stockpile_id) h2) history LEFT JOIN app.stockpile_entry entry1 ON entry1.log_id=history.current_log_id  AND entry1.stockpile_id=history.stockpile_id LEFT JOIN app.stockpile_entry entry2  ON entry2.log_id=history.previous_log_id AND entry1.catalog_id=entry2.catalog_id AND entry1.stockpile_id=entry2.stockpile_id",
      ],
    );
  }
}
