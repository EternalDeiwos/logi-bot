-- Create hexes table
DROP TABLE IF EXISTS hexes;

CREATE TABLE IF NOT EXISTS
  hexes (hex TEXT NOT NULL, name TEXT NOT NULL);

-- 
-- Access controls
ALTER TABLE hexes
ADD CONSTRAINT pk_hexes PRIMARY KEY (hex);

ALTER TABLE hexes ENABLE ROW LEVEL SECURITY;

GRANT DELETE ON TABLE hexes TO "service_role";

GRANT INSERT ON TABLE hexes TO "service_role";

GRANT REFERENCES ON TABLE hexes TO "service_role";

GRANT
SELECT
  ON TABLE hexes TO "service_role";

GRANT TRIGGER ON TABLE hexes TO "service_role";

GRANT
TRUNCATE ON TABLE hexes TO "service_role";

GRANT
UPDATE ON TABLE hexes TO "service_role";

--
-- Fetch and populate hex names from map list API
CREATE
OR REPLACE FUNCTION populate_hexes () RETURNS INTEGER AS $$
BEGIN

  -- Yeet
  TRUNCATE TABLE hexes CASCADE;

  -- Fetch hex names from the API and populate hexes table
  INSERT INTO hexes
  SELECT
    hex,
    -- Drop "Hex" from the name of the hex
    array_to_string(name[:array_length(name, 1) -1], ' ') name
  FROM (
    SELECT
      -- Separate words
      string_to_array(
        regexp_replace(
          trim('"' FROM req.content::text), 
          E'([a-z])([A-Z])', 
          E'\\1 \\2','g'
        ), ' '
      ) name, 
      trim('"' FROM req.content::text) hex
    FROM (
      SELECT jsonb_array_elements(content::jsonb)#>>'{}' content
      FROM http_get('https://war-service-live.foxholeservices.com/api/worldconquest/maps')
    ) req
  ) split;

  RETURN 1;
END;
$$ LANGUAGE plpgsql;