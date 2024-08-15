--
-- Create discord guild
DROP TABLE IF EXISTS guild CASCADE;

CREATE TABLE IF NOT EXISTS
  guild (
    id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY NOT NULL,
    guild_sf BIGINT NOT NULL,
    name TEXT NOT NULL,
    short_name TEXT NOT NULL,
    icon TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    deleted_at TIMESTAMP WITH TIME ZONE,
    UNIQUE NULLS NOT DISTINCT (guild_sf, deleted_at)
  );

CREATE INDEX IF NOT EXISTS name_idx_guild ON guild USING btree (name);

CREATE INDEX IF NOT EXISTS created_at_idx_created_at ON created_at USING btree (created_at);

--
-- Access controls
ALTER TABLE guild ENABLE ROW LEVEL SECURITY;

GRANT
SELECT
  ON TABLE guild TO "anon";

GRANT
SELECT
  ON TABLE guild TO "authenticated";

GRANT DELETE ON TABLE guild TO "service_role";

GRANT INSERT ON TABLE guild TO "service_role";

GRANT REFERENCES ON TABLE guild TO "service_role";

GRANT
SELECT
  ON TABLE guild TO "service_role";

GRANT TRIGGER ON TABLE guild TO "service_role";

GRANT
TRUNCATE ON TABLE guild TO "service_role";

GRANT
UPDATE ON TABLE guild TO "service_role";

--
-- View current registered guilds
CREATE OR REPLACE VIEW
  guild_current
WITH
  (security_invoker = on) AS (
    SELECT
      id,
      guild_sf,
      name,
      short_name,
      icon,
      created_at
    FROM
      guild g
    WHERE
      g.deleted_at IS NULL
  );

-- 
-- Access controls
GRANT
SELECT
  ON TABLE guild_current TO "anon";

GRANT
SELECT
  ON TABLE guild_current TO "authenticated";

GRANT
SELECT
  ON TABLE guild_current TO "service_role";

---------
--
-- Create stockpile
DROP TABLE IF EXISTS stockpile CASCADE;

CREATE TABLE IF NOT EXISTS
  stockpile (
    id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY NOT NULL,
    guild_id BIGINT NOT NULL,
    poi_id BIGINT NOT NULL,
    war_number BIGINT NOT NULL,
    name TEXT NOT NULL,
    code TEXT NOT NULL DEFAULT '000000'::TEXT,
    deleted_at TIMESTAMP WITH TIME ZONE,
    UNIQUE (poi_id, war_number, name),
    FOREIGN KEY (guild_id) REFERENCES guild (id),
    FOREIGN KEY (poi_id) REFERENCES poi (id),
    FOREIGN KEY (war_number) REFERENCES war (war_number)
  );

CREATE INDEX IF NOT EXISTS guild_idx_stockpile ON stockpile USING btree (guild_id);

CREATE INDEX IF NOT EXISTS poi_idx_stockpile ON stockpile USING btree (poi_id);

CREATE INDEX IF NOT EXISTS name_idx_stockpile ON stockpile USING btree (name);

CREATE INDEX IF NOT EXISTS war_idx_stockpile ON stockpile USING btree (war_number);

--
-- Access controls
ALTER TABLE stockpile ENABLE ROW LEVEL SECURITY;

GRANT
SELECT
  ON TABLE stockpile TO "anon";

GRANT
SELECT
  ON TABLE stockpile TO "authenticated";

GRANT DELETE ON TABLE stockpile TO "service_role";

GRANT INSERT ON TABLE stockpile TO "service_role";

GRANT REFERENCES ON TABLE stockpile TO "service_role";

GRANT
SELECT
  ON TABLE stockpile TO "service_role";

GRANT TRIGGER ON TABLE stockpile TO "service_role";

GRANT
TRUNCATE ON TABLE stockpile TO "service_role";

GRANT
UPDATE ON TABLE stockpile TO "service_role";

---------
--
-- Create stockpile log
DROP TABLE IF EXISTS stockpile_log CASCADE;

CREATE TABLE IF NOT EXISTS
  stockpile_log (
    id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY NOT NULL,
    guild_id BIGINT NOT NULL,
    stockpile_id BIGINT NOT NULL,
    war_number BIGINT NOT NULL,
    description TEXT NOT NULL,
    screenshot_path TEXT,
    created_by_sf BIGINT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    FOREIGN KEY (guild_id) REFERENCES guild (id),
    FOREIGN KEY (stockpile_id) REFERENCES stockpile (id),
    FOREIGN KEY (war_number) REFERENCES war (war_number)
  );

CREATE INDEX IF NOT EXISTS guild_idx_stockpile_log ON stockpile_log USING btree (guild_id);

CREATE INDEX IF NOT EXISTS stockpile_idx_stockpile_log ON stockpile_log USING btree (stockpile_id);

CREATE INDEX IF NOT EXISTS war_idx_stockpile_log ON stockpile_log USING btree (war_number);

CREATE INDEX IF NOT EXISTS created_at_idx_stockpile_log ON stockpile_log USING btree (created_at);

COMMENT ON COLUMN stockpile_log.description IS 'A player-provided message describing the change in a stockpile';

--
-- Access controls
ALTER TABLE stockpile_log ENABLE ROW LEVEL SECURITY;

GRANT
SELECT
  ON TABLE stockpile_log TO "anon";

GRANT
SELECT
  ON TABLE stockpile_log TO "authenticated";

GRANT DELETE ON TABLE stockpile_log TO "service_role";

GRANT INSERT ON TABLE stockpile_log TO "service_role";

GRANT REFERENCES ON TABLE stockpile_log TO "service_role";

GRANT
SELECT
  ON TABLE stockpile_log TO "service_role";

GRANT TRIGGER ON TABLE stockpile_log TO "service_role";

GRANT
TRUNCATE ON TABLE stockpile_log TO "service_role";

GRANT
UPDATE ON TABLE stockpile_log TO "service_role";

---------
--
-- Create stockpile content
DROP TABLE IF EXISTS stockpile_entry CASCADE;

CREATE TABLE IF NOT EXISTS
  stockpile_entry (
    id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY NOT NULL,
    guild_id BIGINT NOT NULL,
    log_id BIGINT NOT NULL,
    catalog_id BIGINT NOT NULL,
    war_number BIGINT NOT NULL,
    quantity_loose INTEGER DEFAULT 0 NOT NULL,
    quantity_crates INTEGER DEFAULT 0 NOT NULL,
    quantity_shippable INTEGER DEFAULT 0 NOT NULL,
    created_by_sf BIGINT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    FOREIGN KEY (guild_id) REFERENCES guild (id),
    FOREIGN KEY (log_id) REFERENCES stockpile_log (id),
    FOREIGN KEY (catalog_id) REFERENCES catalog (id),
    FOREIGN KEY (war_number) REFERENCES war (war_number)
  );

CREATE INDEX IF NOT EXISTS guild_idx_stockpile_entry ON stockpile_entry USING btree (guild_id);

CREATE INDEX IF NOT EXISTS stockpile_idx_stockpile_entry ON stockpile_entry USING btree (log_id);

CREATE INDEX IF NOT EXISTS catalog_idx_stockpile_entry ON stockpile_entry USING btree (catalog_id);

CREATE INDEX IF NOT EXISTS war_idx_stockpile_entry ON stockpile_entry USING btree (war_number);

CREATE INDEX IF NOT EXISTS created_at_idx_stockpile_entry ON stockpile_entry USING btree (created_at);

COMMENT ON COLUMN stockpile_entry.quantity_loose IS 'The loose number of items submitted to facility buildings or bunker bases';

COMMENT ON COLUMN stockpile_entry.quantity_crates IS 'The number of crated supply items in a stockpile submitted to storage depots, seaports, or large ships';

COMMENT ON COLUMN stockpile_entry.quantity_shippable IS 'The number of shippable crates in a stockpile submitted to facility buildings or bunker bases';

--
-- Access controls
ALTER TABLE stockpile_entry ENABLE ROW LEVEL SECURITY;

GRANT
SELECT
  ON TABLE stockpile_entry TO "anon";

GRANT
SELECT
  ON TABLE stockpile_entry TO "authenticated";

GRANT DELETE ON TABLE stockpile_entry TO "service_role";

GRANT INSERT ON TABLE stockpile_entry TO "service_role";

GRANT REFERENCES ON TABLE stockpile_entry TO "service_role";

GRANT
SELECT
  ON TABLE stockpile_entry TO "service_role";

GRANT TRIGGER ON TABLE stockpile_entry TO "service_role";

GRANT
TRUNCATE ON TABLE stockpile_entry TO "service_role";

GRANT
UPDATE ON TABLE stockpile_entry TO "service_role";