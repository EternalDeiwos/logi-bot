-- Create poi table
DROP TABLE IF EXISTS poi CASCADE;

CREATE TABLE IF NOT EXISTS
  poi (
    id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    region_id BIGINT NOT NULL,
    war_number BIGINT NOT NULL,
    x FLOAT NOT NULL,
    y FLOAT NOT NULL,
    marker_type INTEGER NOT NULL,
    deleted_at TIMESTAMP WITH TIME ZONE,
    FOREIGN KEY (region_id) REFERENCES region (id) ON DELETE RESTRICT,
    FOREIGN KEY (war_number) REFERENCES war (war_number) ON DELETE RESTRICT
  );

CREATE INDEX IF NOT EXISTS region_idx_poi ON poi USING btree (region_id);

CREATE INDEX IF NOT EXISTS war_number_idx_poi ON poi USING btree (war_number);

CREATE INDEX IF NOT EXISTS marker_type_idx_poi ON poi USING btree (marker_type);

--
-- Access controls
ALTER TABLE poi ENABLE ROW LEVEL SECURITY;

GRANT
SELECT
  ON TABLE poi TO "anon";

GRANT
SELECT
  ON TABLE poi TO "authenticated";

GRANT DELETE ON TABLE poi TO "service_role";

GRANT INSERT ON TABLE poi TO "service_role";

GRANT REFERENCES ON TABLE poi TO "service_role";

GRANT
SELECT
  ON TABLE poi TO "service_role";

GRANT TRIGGER ON TABLE poi TO "service_role";

GRANT
TRUNCATE ON TABLE poi TO "service_role";

GRANT
UPDATE ON TABLE poi TO "service_role";

--
-- Determine points of interest from region information
CREATE
OR REPLACE FUNCTION populate_poi () RETURNS INTEGER AS $$
DECLARE
  hex RECORD;
BEGIN

  UPDATE poi SET deleted_at = now() WHERE deleted_at IS NULL;

  FOR hex IN
    SELECT DISTINCT ON (hex_id)
      *
    FROM region_update
    ORDER BY hex_id, updated_at DESC
  LOOP

    WITH war AS (
      SELECT * FROM war_current
    )
    INSERT INTO poi (region_id, war_number, x, y, marker_type)
    SELECT DISTINCT ON (d->'x', d->'y')
      r.id region_id,
      w.war_number,
      (d->'x')::float x,
      (d->'y')::float y,
      (d->'iconType')::int marker_type
    FROM (
      SELECT DISTINCT ON (hex_id)
        *
      FROM region_update
      WHERE hex_id=hex.hex_id
      ORDER BY hex_id, updated_at DESC
    ) u, war w, jsonb_array_elements(u.data) d
    CROSS JOIN (
      SELECT *
      FROM region_current
      WHERE hex_id=hex.hex_id
        AND major_name IS NOT NULL
    ) r
    ORDER BY d->'x', d->'y', calculate_distance((d->'x')::float, (d->'y')::float, r.x, r.y) ASC;

  END LOOP;

  RETURN 1;

END;
$$ LANGUAGE plpgsql;

select
  populate_poi ();

--
-- Active points of interest with region information
CREATE OR REPLACE VIEW
  poi_current
WITH
  (security_invoker = on) AS (
    SELECT
      p.id,
      r.hex_id,
      p.region_id,
      p.war_number,
      p.x,
      p.y,
      p.marker_type,
      r.x rx,
      r.y ry,
      r.hex_name,
      r.major_name,
      r.minor_name,
      r.slang
    FROM
      poi p
      JOIN region r ON r.id = p.region_id
    WHERE
      p.deleted_at IS NULL
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