import { MigrationInterface, QueryRunner } from 'typeorm';

export class GameStockpileHistory1733243029192 implements MigrationInterface {
  name = 'GameStockpileHistory1733243029192';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE VIEW "app"."stockpile_log_history" AS SELECT DISTINCT ON ("entry"."stockpile_id", "entry"."log_id", "l"."created_at") ROW_NUMBER() OVER (PARTITION BY "entry"."stockpile_id" ORDER BY "l"."created_at" DESC) AS rank, "entry"."stockpile_id" stockpile_id, "entry"."log_id" log_id, "l"."created_at" created_at FROM "app"."stockpile_entry" "entry" LEFT JOIN "app"."stockpile_log" "l" ON "l"."id"="entry"."log_id" WHERE "l"."deleted_at" IS NULL GROUP BY "entry"."stockpile_id", "entry"."log_id", "l"."created_at"`,
    );
    await queryRunner.query(
      `INSERT INTO "app"."typeorm_metadata"("database", "schema", "table", "type", "name", "value") VALUES (DEFAULT, $1, DEFAULT, $2, $3, $4)`,
      [
        'app',
        'VIEW',
        'stockpile_log_history',
        'SELECT DISTINCT ON ("entry"."stockpile_id", "entry"."log_id", "l"."created_at") ROW_NUMBER() OVER (PARTITION BY "entry"."stockpile_id" ORDER BY "l"."created_at" DESC) AS rank, "entry"."stockpile_id" stockpile_id, "entry"."log_id" log_id, "l"."created_at" created_at FROM "app"."stockpile_entry" "entry" LEFT JOIN "app"."stockpile_log" "l" ON "l"."id"="entry"."log_id" WHERE "l"."deleted_at" IS NULL GROUP BY "entry"."stockpile_id", "entry"."log_id", "l"."created_at"',
      ],
    );
    await queryRunner.query(`
      CREATE VIEW "app"."stockpile_diff" AS 
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
        "SELECT entry1.id current_entry_id, entry2.id previous_entry_id, history.current_log_id, history.previous_log_id, history.stockpile_id, entry1.catalog_id, entry1.guild_id, entry1.war_number, entry1.quantity_crated, entry1.quantity_shippable, entry1.quantity_uncrated, history.created_at, entry1.created_by_sf, history.since_previous, COALESCE(entry1.quantity_crated - entry2.quantity_crated, entry1.quantity_crated) as diff_crated, COALESCE(entry1.quantity_shippable - entry2.quantity_shippable, entry1.quantity_shippable) as diff_shippable, COALESCE(entry1.quantity_uncrated - entry2.quantity_uncrated, entry1.quantity_uncrated) as diff_uncrated FROM (SELECT h1.stockpile_id stockpile_id, h1.log_id current_log_id, h2.log_id previous_log_id, h1.created_at created_at, COALESCE(h1.created_at - h2.created_at, '0'::interval) since_previous   FROM app.stockpile_log_history h1, LATERAL (SELECT * FROM app.stockpile_log_history hh2 WHERE hh2.rank=h1.rank+1 AND hh2.stockpile_id=h1.stockpile_id) h2) history LEFT JOIN app.stockpile_entry entry1 ON entry1.log_id=history.current_log_id  AND entry1.stockpile_id=history.stockpile_id LEFT JOIN app.stockpile_entry entry2  ON entry2.log_id=history.previous_log_id AND entry1.catalog_id=entry2.catalog_id AND entry1.stockpile_id=entry2.stockpile_id",
      ],
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DELETE FROM "app"."typeorm_metadata" WHERE "type" = $1 AND "name" = $2 AND "schema" = $3`,
      ['VIEW', 'stockpile_diff', 'app'],
    );
    await queryRunner.query(`DROP VIEW "app"."stockpile_diff"`);
    await queryRunner.query(
      `DELETE FROM "app"."typeorm_metadata" WHERE "type" = $1 AND "name" = $2 AND "schema" = $3`,
      ['VIEW', 'stockpile_log_history', 'app'],
    );
    await queryRunner.query(`DROP VIEW "app"."stockpile_log_history"`);
  }
}
