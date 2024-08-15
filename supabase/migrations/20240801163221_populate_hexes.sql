-- Create hex table
DROP TABLE IF EXISTS hex;

CREATE TABLE IF NOT EXISTS
  hex (hex TEXT PRIMARY KEY NOT NULL, name TEXT NOT NULL);

-- 
-- Access controls
ALTER TABLE hex ENABLE ROW LEVEL SECURITY;

GRANT DELETE ON TABLE hex TO "service_role";

GRANT INSERT ON TABLE hex TO "service_role";

GRANT REFERENCES ON TABLE hex TO "service_role";

GRANT
SELECT
  ON TABLE hex TO "service_role";

GRANT TRIGGER ON TABLE hex TO "service_role";

GRANT
TRUNCATE ON TABLE hex TO "service_role";

GRANT
UPDATE ON TABLE hex TO "service_role";

--
-- Fetch and populate hex names from map list API
CREATE
OR REPLACE FUNCTION populate_hexes () RETURNS INTEGER AS $$
BEGIN

  -- Yeet
  TRUNCATE TABLE hex CASCADE;

  -- Fetch hex names from the API and populate hex table
  INSERT INTO hex
  SELECT
    split.hex,
    -- Drop "Hex" from the name of the hex
    (
      CASE 
        WHEN name[array_length(name, 1)] = 'Hex' THEN array_to_string(name[:array_length(name, 1) -1], ' ')
        ELSE array_to_string(name, ' ')
      END
    ) name
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