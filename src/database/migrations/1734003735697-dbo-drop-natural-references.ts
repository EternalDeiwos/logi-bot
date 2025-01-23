import { MigrationInterface, QueryRunner } from 'typeorm';

export class DboDropNaturalReferences1734003735697 implements MigrationInterface {
  name = 'DboDropNaturalReferences1734003735697';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DELETE FROM "app"."typeorm_metadata" WHERE "type" = $1 AND "name" = $2 AND "schema" = $3`,
      ['VIEW', 'stockpile_entry_current', 'app'],
    );
    await queryRunner.query(`DROP VIEW "app"."stockpile_entry_current"`);
    await queryRunner.query(`DROP INDEX "app"."crew_channel_sf_idx_tag_template"`);
    await queryRunner.query(`DROP INDEX "app"."previous_thread_sf_idx_ticket"`);
    await queryRunner.query(`DROP INDEX "app"."crew_channel_sf_idx_ticket"`);
    await queryRunner.query(`DROP INDEX "app"."crew_channel_sf_idx_crew_member"`);
    await queryRunner.query(`DROP INDEX "app"."crew_channel_sf_idx_crew_log"`);
    await queryRunner.query(`DROP INDEX "app"."crew_channel_sf_idx_stockpile_log"`);
    await queryRunner.query(
      `ALTER TABLE "app"."crew_member" DROP CONSTRAINT "uk_crew_channel_member_deleted_at"`,
    );
    await queryRunner.query(`ALTER TABLE "app"."tag_template" DROP COLUMN "crew_channel_sf"`);
    await queryRunner.query(`ALTER TABLE "app"."ticket" DROP COLUMN "crew_channel_sf"`);
    await queryRunner.query(`ALTER TABLE "app"."ticket" DROP COLUMN "previous_thread_sf"`);
    await queryRunner.query(`ALTER TABLE "app"."crew_member" DROP COLUMN "crew_channel_sf"`);
    await queryRunner.query(`ALTER TABLE "app"."crew_log" DROP COLUMN "crew_channel_sf"`);
    await queryRunner.query(`ALTER TABLE "app"."crew_share" DROP COLUMN "crew_channel_sf"`);
    await queryRunner.query(`ALTER TABLE "app"."stockpile_log" DROP COLUMN "crew_channel_sf"`);
    await queryRunner.query(
      `CREATE INDEX "crew_channel_sf_idx_crew" ON "app"."crew" ("crew_channel_sf") `,
    );
    await queryRunner.query(
      `ALTER TABLE "app"."crew_member" ADD CONSTRAINT "uk_crew_member_user_deleted_at" UNIQUE NULLS NOT DISTINCT ("crew_id", "member_sf", "deleted_at")`,
    );
    await queryRunner.query(
      `CREATE VIEW "app"."stockpile_entry_current" AS SELECT DISTINCT ON ("entry"."stockpile_id", "entry"."catalog_id") "l"."id" AS "l_id", "l"."crew_id" AS "l_crew_id", "l"."location_id" AS "l_location_id", "l"."war_number" AS "l_war_number", "l"."guild_id" AS "l_guild_id", "l"."message" AS "l_message", "l"."raw" AS "l_raw", "l"."processed_at" AS "l_processed_at", "l"."created_by_sf" AS "l_created_by_sf", "l"."created_at" AS "l_created_at", "l"."deleted_by_sf" AS "l_deleted_by_sf", "l"."deleted_at" AS "l_deleted_at", "c"."id" AS "c_id", "c"."foxhole_version" AS "c_foxhole_version", "c"."catalog_version" AS "c_catalog_version", "c"."code_name" AS "c_code_name", "c"."slang" AS "c_slang", "c"."display_name" AS "c_display_name", "c"."faction" AS "c_faction", "c"."category" AS "c_category", "c"."crate_quantity" AS "c_crate_quantity", "c"."shippable_quantity" AS "c_shippable_quantity", "c"."crate_stockpile_maximum" AS "c_crate_stockpile_maximum", "c"."shippable_stockpile_maximum" AS "c_shippable_stockpile_maximum", "c"."data" AS "c_data", "c"."created_at" AS "c_created_at", entry.* FROM "app"."stockpile_entry" "entry" LEFT JOIN "app"."stockpile_log" "l" ON "l"."id"="entry"."log_id"  LEFT JOIN "app"."catalog_expanded" "c" ON "c"."id"="entry"."catalog_id" WHERE "l"."deleted_at" IS NULL ORDER BY "entry"."stockpile_id" ASC, "entry"."catalog_id" ASC, "entry"."created_at" DESC`,
    );
    await queryRunner.query(
      `INSERT INTO "app"."typeorm_metadata"("database", "schema", "table", "type", "name", "value") VALUES (DEFAULT, $1, DEFAULT, $2, $3, $4)`,
      [
        'app',
        'VIEW',
        'stockpile_entry_current',
        'SELECT DISTINCT ON ("entry"."stockpile_id", "entry"."catalog_id") "l"."id" AS "l_id", "l"."crew_id" AS "l_crew_id", "l"."location_id" AS "l_location_id", "l"."war_number" AS "l_war_number", "l"."guild_id" AS "l_guild_id", "l"."message" AS "l_message", "l"."raw" AS "l_raw", "l"."processed_at" AS "l_processed_at", "l"."created_by_sf" AS "l_created_by_sf", "l"."created_at" AS "l_created_at", "l"."deleted_by_sf" AS "l_deleted_by_sf", "l"."deleted_at" AS "l_deleted_at", "c"."id" AS "c_id", "c"."foxhole_version" AS "c_foxhole_version", "c"."catalog_version" AS "c_catalog_version", "c"."code_name" AS "c_code_name", "c"."slang" AS "c_slang", "c"."display_name" AS "c_display_name", "c"."faction" AS "c_faction", "c"."category" AS "c_category", "c"."crate_quantity" AS "c_crate_quantity", "c"."shippable_quantity" AS "c_shippable_quantity", "c"."crate_stockpile_maximum" AS "c_crate_stockpile_maximum", "c"."shippable_stockpile_maximum" AS "c_shippable_stockpile_maximum", "c"."data" AS "c_data", "c"."created_at" AS "c_created_at", entry.* FROM "app"."stockpile_entry" "entry" LEFT JOIN "app"."stockpile_log" "l" ON "l"."id"="entry"."log_id"  LEFT JOIN "app"."catalog_expanded" "c" ON "c"."id"="entry"."catalog_id" WHERE "l"."deleted_at" IS NULL ORDER BY "entry"."stockpile_id" ASC, "entry"."catalog_id" ASC, "entry"."created_at" DESC',
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
      `ALTER TABLE "app"."crew_member" DROP CONSTRAINT "uk_crew_member_user_deleted_at"`,
    );
    await queryRunner.query(`DROP INDEX "app"."crew_channel_sf_idx_crew"`);

    // Migrate stockpile_log to use old crew_channel_sf
    await queryRunner.query(`ALTER TABLE "app"."stockpile_log" ADD "crew_channel_sf" bigint`);
    await queryRunner.query(`
        UPDATE "app"."stockpile_log" log SET crew_channel_sf=c.crew_channel_sf
        FROM (
            SELECT crew.crew_channel_sf, log.crew_id
            FROM "app"."stockpile_log" log
            LEFT JOIN "app"."crew" crew ON crew.id=log.crew_id
        ) c
        WHERE c.crew_id=log.crew_id
    `);
    // ---

    // Migrate crew_share to use old crew_channel_sf
    await queryRunner.query(`ALTER TABLE "app"."crew_share" ADD "crew_channel_sf" bigint`);
    await queryRunner.query(`
        UPDATE "app"."crew_share" share SET crew_channel_sf=c.crew_channel_sf
        FROM (
            SELECT crew.crew_channel_sf, share.crew_id
            FROM "app"."crew_share" share
            LEFT JOIN "app"."crew" crew ON crew.id=share.crew_id
        ) c
        WHERE c.crew_id=share.crew_id
    `);
    await queryRunner.query(
      `ALTER TABLE "app"."crew_share" ALTER COLUMN "crew_channel_sf" SET NOT NULL`,
    );
    // ---

    // Migrate crew_log to use old crew_channel_sf
    await queryRunner.query(`ALTER TABLE "app"."crew_log" ADD "crew_channel_sf" bigint`);
    await queryRunner.query(`
        UPDATE "app"."crew_log" log SET crew_channel_sf=c.crew_channel_sf
        FROM (
            SELECT crew.crew_channel_sf, log.crew_id
            FROM "app"."crew_log" log
            LEFT JOIN "app"."crew" crew ON crew.id=log.crew_id
        ) c
        WHERE c.crew_id=log.crew_id
    `);
    await queryRunner.query(
      `ALTER TABLE "app"."crew_log" ALTER COLUMN "crew_channel_sf" SET NOT NULL`,
    );
    // ---

    // Migrate crew_member to use old crew_channel_sf
    await queryRunner.query(`ALTER TABLE "app"."crew_member" ADD "crew_channel_sf" bigint`);
    await queryRunner.query(`
        UPDATE "app"."crew_member" member SET crew_channel_sf=c.crew_channel_sf
        FROM (
            SELECT crew.crew_channel_sf, member.crew_id
            FROM "app"."crew_member" member
            LEFT JOIN "app"."crew" crew ON crew.id=member.crew_id
        ) c
        WHERE c.crew_id=member.crew_id
    `);
    await queryRunner.query(
      `ALTER TABLE "app"."crew_member" ALTER COLUMN "crew_channel_sf" SET NOT NULL`,
    );
    // ---

    // Migrate ticket to use old previous_thread_sf
    await queryRunner.query(`ALTER TABLE "app"."ticket" ADD "previous_thread_sf" bigint`);
    await queryRunner.query(`
        UPDATE "app"."ticket" ticket SET previous_thread_sf=c.previous_thread_sf
        FROM (
            SELECT previous_ticket.previous_thread_sf, ticket.previous_ticket_id
            FROM "app"."ticket" ticket
            LEFT JOIN "app"."ticket" previous_ticket ON previous_ticket.id=ticket.previous_ticket_id
        ) c
        WHERE c.previous_ticket_id=ticket.previous_ticket_id
    `);
    // ---

    // Migrate ticket to use old crew_channel_sf
    await queryRunner.query(`ALTER TABLE "app"."ticket" ADD "crew_channel_sf" bigint`);
    await queryRunner.query(`
        UPDATE "app"."ticket" ticket SET crew_channel_sf=t.crew_channel_sf
        FROM (
            SELECT crew.crew_channel_sf, ticket.crew_id
            FROM "app"."ticket" ticket
            LEFT JOIN "app"."crew" crew ON crew.id=ticket.crew_id
        ) t
        WHERE t.crew_id=ticket.crew_id
    `);
    await queryRunner.query(
      `ALTER TABLE "app"."ticket" ALTER COLUMN "crew_channel_sf" SET NOT NULL`,
    );
    // ---

    // Migrate tag_template to use old crew_channel_sf
    await queryRunner.query(`ALTER TABLE "app"."tag_template" ADD "crew_channel_sf" bigint`);
    await queryRunner.query(`
        UPDATE "app"."tag_template" log SET crew_channel_sf=t.crew_channel_sf
        FROM (
            SELECT crew.crew_channel_sf, log.crew_id
            FROM "app"."tag_template" log
            LEFT JOIN "app"."crew" crew ON crew.id=log.crew_id
        ) t
        WHERE t.crew_id=log.crew_id
    `);
    // ---

    await queryRunner.query(
      `ALTER TABLE "app"."crew_member" ADD CONSTRAINT "uk_crew_channel_member_deleted_at" UNIQUE NULLS NOT DISTINCT ("member_sf", "crew_channel_sf", "deleted_at")`,
    );
    await queryRunner.query(
      `CREATE INDEX "crew_channel_sf_idx_stockpile_log" ON "app"."stockpile_log" ("crew_channel_sf") `,
    );
    await queryRunner.query(
      `CREATE INDEX "crew_channel_sf_idx_crew_log" ON "app"."crew_log" ("crew_channel_sf") `,
    );
    await queryRunner.query(
      `CREATE INDEX "crew_channel_sf_idx_crew_member" ON "app"."crew_member" ("crew_channel_sf") `,
    );
    await queryRunner.query(
      `CREATE INDEX "crew_channel_sf_idx_ticket" ON "app"."ticket" ("crew_channel_sf") `,
    );
    await queryRunner.query(
      `CREATE INDEX "previous_thread_sf_idx_ticket" ON "app"."ticket" ("previous_thread_sf") `,
    );
    await queryRunner.query(
      `CREATE INDEX "crew_channel_sf_idx_tag_template" ON "app"."tag_template" ("crew_channel_sf") `,
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
}
