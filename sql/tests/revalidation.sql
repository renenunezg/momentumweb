\set ON_ERROR_STOP on
BEGIN;
-- Isolated stand-ins capture outgoing requests without contacting the site.
CREATE SCHEMA vault;
CREATE TABLE vault.decrypted_secrets(name text, decrypted_secret text);
INSERT INTO vault.decrypted_secrets VALUES ('site_revalidate_secret', 'acceptance-only');
CREATE SCHEMA net;
CREATE TABLE net.requests(url text, headers jsonb, body jsonb, timeout_milliseconds integer);
CREATE FUNCTION net.http_post(url text, headers jsonb, body jsonb, timeout_milliseconds integer)
RETURNS bigint LANGUAGE plpgsql AS $$
BEGIN
 INSERT INTO net.requests VALUES (url, headers, body, timeout_milliseconds);
 RETURN 1;
END $$;
\ir ../001_site_revalidate.sql
DO $$
DECLARE sport text;
BEGIN
 FOREACH sport IN ARRAY ARRAY['mlb', 'cfb', 'nfl', 'nhl'] LOOP
  EXECUTE format('CREATE SCHEMA %I', sport);
  EXECUTE format('CREATE TABLE %I.forecasts (id integer)', sport);
  EXECUTE format('CREATE TRIGGER site_revalidate AFTER INSERT OR UPDATE OR DELETE ON %I.forecasts FOR EACH STATEMENT EXECUTE FUNCTION public.site_revalidate()', sport);
  EXECUTE format('INSERT INTO %I.forecasts VALUES (1), (2)', sport);
 END LOOP;
 IF (SELECT count(*) FROM net.requests) <> 4 OR EXISTS (
   SELECT 1 FROM net.requests WHERE url <> 'https://www.renenunez.dev/api/revalidate'
     OR headers->>'x-revalidate-secret' <> 'acceptance-only'
     OR body->>'table' <> 'forecasts'
     OR body->>'schema' NOT IN ('mlb', 'cfb', 'nfl', 'nhl')
     OR timeout_milliseconds <> 5000
 ) THEN RAISE EXCEPTION 'Invalid shared revalidation payload'; END IF;
 IF EXISTS (SELECT 1 FROM pg_proc p, LATERAL aclexplode(coalesce(p.proacl, acldefault('f', p.proowner))) a
    WHERE p.oid = 'public.site_revalidate()'::regprocedure AND a.grantee = 0 AND a.privilege_type = 'EXECUTE') THEN
   RAISE EXCEPTION 'Revalidation function is publicly executable';
 END IF;
END $$;
ROLLBACK;
