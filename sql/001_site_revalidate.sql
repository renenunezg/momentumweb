-- Requires Supabase pg_net and Vault; provision site_revalidate_secret separately.
CREATE OR REPLACE FUNCTION public.site_revalidate()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
  perform net.http_post(
    url := 'https://www.renenunez.dev/api/revalidate',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-revalidate-secret',
      (select decrypted_secret from vault.decrypted_secrets where name = 'site_revalidate_secret')
    ),
    body := jsonb_build_object('schema', tg_table_schema, 'table', tg_table_name),
    timeout_milliseconds := 5000
  );
  return null;
end
$function$
;
REVOKE ALL ON FUNCTION public.site_revalidate() FROM PUBLIC;
