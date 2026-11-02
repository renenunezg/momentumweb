-- Requires pg_cron and 001_site_revalidate.sql's secret. The home page shows
-- the site day's picks (America/Los_Angeles), so it is refreshed just after
-- midnight there; 07:01 and 08:01 UTC cover both daylight and standard time.
SELECT cron.schedule(
  'site-day-rollover',
  '1 7,8 * * *',
  $$
  select net.http_post(
    url := 'https://www.renenunez.dev/api/revalidate',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-revalidate-secret',
      (select decrypted_secret from vault.decrypted_secrets where name = 'site_revalidate_secret')
    ),
    body := jsonb_build_object('path', '/'),
    timeout_milliseconds := 5000
  )
  $$
);
