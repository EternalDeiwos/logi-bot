-- Create region table
DROP TABLE IF EXISTS region;

CREATE TABLE IF NOT EXISTS
  region (
    id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    hex_id BIGINT NOT NULL,
    hex_name TEXT NOT NULL,
    major_name TEXT,
    minor_name TEXT,
    slang TEXT[] NOT NULL DEFAULT '{}',
    x FLOAT NOT NULL,
    y FLOAT NOT NULL,
    deleted_at TIMESTAMP WITH TIME ZONE,
    UNIQUE NULLS NOT DISTINCT (hex_id, major_name, minor_name, deleted_at)
  );

CREATE INDEX IF NOT EXISTS hex_idx_region ON region USING btree (hex_id);

--
-- Access controls
ALTER TABLE region ENABLE ROW LEVEL SECURITY;

GRANT
SELECT
  ON TABLE region TO "anon";

GRANT
SELECT
  ON TABLE region TO "authenticated";

GRANT DELETE ON TABLE region TO "service_role";

GRANT INSERT ON TABLE region TO "service_role";

GRANT REFERENCES ON TABLE region TO "service_role";

GRANT
SELECT
  ON TABLE region TO "service_role";

GRANT TRIGGER ON TABLE region TO "service_role";

GRANT
TRUNCATE ON TABLE region TO "service_role";

GRANT
UPDATE ON TABLE region TO "service_role";

--
-- Distance function (simple Geometry without PostGIS)
CREATE
OR REPLACE FUNCTION calculate_distance (x1 FLOAT, y1 FLOAT, x2 FLOAT, y2 FLOAT) RETURNS FLOAT AS $$ 
BEGIN 
  RETURN sqrt(power(x1 - x2, 2) + power(y1 - y2, 2));
END;
$$ LANGUAGE plpgsql;

--
-- Fetch and populate major and minor regions from static map API
CREATE
OR REPLACE FUNCTION populate_regions () RETURNS INTEGER AS $$
DECLARE
  hex RECORD;
BEGIN

  RAISE NOTICE 'Marking previous regions deleted';
  UPDATE region SET deleted_at = now() WHERE deleted_at IS NULL;

  FOR hex IN 
    SELECT * FROM hex
  LOOP
  
    --
    -- Fetch the static map data from the clapfoot API
    WITH static_data AS (
      SELECT content->'regionId' hex_id,
        c.*
      FROM (
          SELECT status,
            content::jsonb 
          FROM http_get(
              format(
                'https://war-service-live.foxholeservices.com/api/worldconquest/maps/%s/static',
                hex.hex
              )
            )
        ) req
        CROSS JOIN LATERAL jsonb_to_recordset(req.content->'mapTextItems') c(
          "text" text,
          "x" float,
          "y" float,
          "mapMarkerType" text
        )
    )

    --
    -- Populate layered region information:
    -- 1. Hex
    -- 2. Hex, Major
    -- 3. Hex, Major, Minor
    INSERT INTO region (hex_id, hex_name, major_name, minor_name, x, y)
    SELECT regions.hex_id::bigint,
      hex.name hex_name,
      regions.major_name,
      regions.minor_name,
      regions.x,
      regions.y
    FROM (
        (
          --
          -- Select minor region labels and assign the closest major region
          SELECT DISTINCT ON (minors.text) majors.hex_id,
            majors.text major_name,
            minors.text minor_name,
            majors.x,
            majors.y
          FROM (
              SELECT *
              FROM static_data
              WHERE "mapMarkerType" = 'Major'
            ) majors
            CROSS JOIN (
              SELECT *
              FROM static_data
              WHERE "mapMarkerType" = 'Minor'
            ) minors
          ORDER BY minor_name,
            calculate_distance(majors.x, majors.y, minors.x, minors.y) ASC
        )
        UNION
        (
          --
          -- Select major region labels for more general placement
          SELECT hex_id,
            text major_name,
            null::text minor_name,
            x,
            y
          FROM static_data
          WHERE "mapMarkerType" = 'Major'
        )
        UNION
        (
          --
          -- Select just the hex label for broad area definitions
          SELECT hex_id,
            null::text major_name,
            null::text minor_name,
            0.5::float x,
            0.5::float y
          FROM static_data
          LIMIT 1
        )
        ORDER BY minor_name,
          major_name
      ) regions;

    END LOOP;

  RETURN 1;
END;
$$ LANGUAGE plpgsql;

--
-- View helper to retrieve currently active regions
CREATE OR REPLACE VIEW
  region_current
WITH
  (security_invoker = on) AS (
    SELECT
      *
    FROM
      region
    WHERE
      deleted_at IS NULL
  );

-- 
-- Access controls
GRANT
SELECT
  ON TABLE region_current TO "anon";

GRANT
SELECT
  ON TABLE region_current TO "authenticated";

GRANT
SELECT
  ON TABLE region_current TO "service_role";