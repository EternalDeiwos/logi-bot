--
-- Create table
CREATE TABLE IF NOT EXISTS
  region_update (
    id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    hex_id BIGINT NOT NULL,
    version BIGINT NOT NULL,
    war_number BIGINT NOT NULL,
    data JSONB NOT NULL,
    updated_at TIMESTAMP WITHOUT TIME ZONE NOT NULL,
    FOREIGN KEY (war_number) REFERENCES war (war_number) ON DELETE RESTRICT
  );

CREATE INDEX IF NOT EXISTS hex_idx_region_update ON region_update USING btree (hex_id);

CREATE INDEX IF NOT EXISTS war_number_idx_region_update ON region_update USING btree (war_number);

CREATE INDEX IF NOT EXISTS updated_at_idx_region_update ON region_update USING btree (updated_at);

--
-- Access controls
ALTER TABLE region_update ENABLE ROW LEVEL SECURITY;

GRANT
SELECT
  ON TABLE region_update TO "anon";

GRANT
SELECT
  ON TABLE region_update TO "authenticated";

GRANT DELETE ON TABLE region_update TO "service_role";

GRANT INSERT ON TABLE region_update TO "service_role";

GRANT REFERENCES ON TABLE region_update TO "service_role";

GRANT
SELECT
  ON TABLE region_update TO "service_role";

GRANT TRIGGER ON TABLE region_update TO "service_role";

GRANT
TRUNCATE ON TABLE region_update TO "service_role";

GRANT
UPDATE ON TABLE region_update TO "service_role";

--
-- Update region
CREATE
OR REPLACE FUNCTION update_regions () RETURNS INTEGER AS $$
  DECLARE r RECORD;
BEGIN
  
  FOR r IN 
    WITH region AS (
      SELECT DISTINCT ON (rr.hex_id)
        rr.hex_id,
        (
          -- Devman bad
          CASE 
            WHEN rr.hex_name = 'Marban Hollow' THEN 'MarbanHollow'
            ELSE array_to_string(string_to_array(rr.hex_name, ' '), '') || 'Hex'
          END
        ) hex_name,
        u.version,
        u.updated_at
      FROM region rr
      LEFT OUTER JOIN (
        SELECT DISTINCT ON (hex_id)
          hex_id,
          version,
          updated_at
        FROM region_update
        ORDER BY hex_id, updated_at DESC
      ) u ON rr.hex_id=u.hex_id
    ), war AS (
      SELECT * FROM war_current
    )
    SELECT
      status,
      region.hex_id,
      (content::jsonb->'version')::bigint version,
      war.war_number,
      content::jsonb#>'{mapItems}' data,
      to_timestamp((content::jsonb->>'lastUpdated')::bigint / 1000) updated_at
    FROM 
      region,
      war,
      http((
        'GET',
        format('https://war-service-live.foxholeservices.com/api/worldconquest/maps/%s/dynamic/public', region.hex_name),
        ARRAY[http_header('If-None-Match', format('"%s"', coalesce(region.version::text, '')))],
        NULL,
        NULL
      )::http_request) req
  
  LOOP

    CONTINUE WHEN r.status != 200;

    INSERT INTO region_update (hex_id, version, war_number, data, updated_at)
    SELECT 
      r.hex_id,
      r.version,
      r.war_number,
      r.data,
      r.updated_at;

  END LOOP;

  RETURN 1;
END;
$$ LANGUAGE plpgsql;

--
-- Schedule region update every 6 minutes (10 times per hour)
SELECT
  cron.schedule ('update_regions', '2-59/6 * * * *', 'SELECT update_regions()');

--
-- Latest region update for each hex
CREATE OR REPLACE VIEW
  region_update_latest
WITH
  (security_invoker = on) AS (
    SELECT DISTINCT
      ON (hex_id) *
    FROM
      region_update u
    ORDER BY
      hex_id,
      updated_at DESC
  );

-- 
-- Access controls
GRANT
SELECT
  ON TABLE region_update_latest TO "anon";

GRANT
SELECT
  ON TABLE region_update_latest TO "authenticated";

GRANT
SELECT
  ON TABLE region_update_latest TO "service_role";