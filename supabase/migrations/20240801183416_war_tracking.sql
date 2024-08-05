-- Create faction enum as appears in API
-- Wrapped to ensure that recreation doesn't break 
DO $$ BEGIN
  CREATE TYPE faction AS ENUM ('COLONIALS', 'WARDENS', 'NONE');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Create war table
DROP TABLE IF EXISTS war;

CREATE TABLE IF NOT EXISTS
  war (
    war_number BIGINT NOT NULL,
    winner faction NOT NULL DEFAULT 'NONE',
    clapfoot_id TEXT NOT NULL,
    started_at TIMESTAMP WITHOUT TIME ZONE NOT NULL,
    ended_at TIMESTAMP WITHOUT TIME ZONE
  );

ALTER TABLE war
ADD CONSTRAINT pk_war PRIMARY KEY (war_number);

-- 
-- Access controls
ALTER TABLE war ENABLE ROW LEVEL SECURITY;

GRANT
SELECT
  ON TABLE war TO "anon";

GRANT
SELECT
  ON TABLE war TO "authenticated";

GRANT DELETE ON TABLE war TO "service_role";

GRANT INSERT ON TABLE war TO "service_role";

GRANT REFERENCES ON TABLE war TO "service_role";

GRANT
SELECT
  ON TABLE war TO "service_role";

GRANT TRIGGER ON TABLE war TO "service_role";

GRANT
TRUNCATE ON TABLE war TO "service_role";

GRANT
UPDATE ON TABLE war TO "service_role";

--
-- Fetch and populate war status from API
CREATE
OR REPLACE FUNCTION update_war () RETURNS INTEGER AS $$
BEGIN

  -- Fetch war status
  WITH status AS (
    SELECT
      req.status,
      req.headers,
      (req.content->>'warId') clapfoot_id,
      (req.content->'warNumber')::bigint war_number,
      (req.content->>'winner')::text::faction winner,
      to_timestamp((req.content->>'conquestStartTime')::bigint / 1000) started_at,
      (
        CASE
          WHEN (req.content->>'conquestEndTime') IS NULL THEN NULL
          ELSE to_timestamp((req.content->>'conquestEndTime')::bigint / 1000)
        END
      ) ended_at
    FROM (
      SELECT 
        status,
        headers,
        content::jsonb
      FROM http_get('https://war-service-live.foxholeservices.com/api/worldconquest/war')
    ) req
  )
  -- Record war
  INSERT INTO war (war_number, winner, clapfoot_id, started_at, ended_at)
  SELECT
    s.war_number,
    s.winner,
    s.clapfoot_id, 
    s.started_at, 
    s.ended_at
  FROM status s
  -- Update existing war
  ON CONFLICT (war_number)
  DO UPDATE SET (winner, ended_at) = (EXCLUDED.winner, EXCLUDED.ended_at);

  RETURN 1;

END;
$$ LANGUAGE plpgsql;

--
-- View helper to retrieve the current war
CREATE OR REPLACE VIEW
  war_current
WITH
  (security_invoker = on) AS (
    SELECT DISTINCT
      ON (war_number) *
    FROM
      war
    ORDER BY
      war_number DESC
    LIMIT
      1
  );

-- 
-- Access controls
GRANT
SELECT
  ON TABLE war_current TO "anon";

GRANT
SELECT
  ON TABLE war_current TO "authenticated";

GRANT
SELECT
  ON TABLE war_current TO "service_role";