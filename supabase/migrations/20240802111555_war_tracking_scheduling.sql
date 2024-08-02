--
-- Enable pg_cron
CREATE EXTENSION pg_cron
WITH
  SCHEMA extensions;

GRANT USAGE ON SCHEMA cron TO postgres;

GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA cron TO postgres;

-- 
-- Update war status every 15 minutes
SELECT
  cron.schedule ('update_war_status', '*/15 * * * *', 'SELECT update_war()');