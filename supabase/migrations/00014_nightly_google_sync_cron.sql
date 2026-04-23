-- Nightly Google Tasks sync via pg_cron + pg_net
--
-- BEFORE running this migration:
--   1. Deploy the edge function:
--        supabase functions deploy sync-google-tasks
--   2. Store your service role key in Vault (run once in Supabase SQL Editor):
--        SELECT vault.create_secret('<YOUR_SERVICE_ROLE_KEY>', 'service_role_key');
--      Find your service role key in: Supabase Dashboard → Settings → API → service_role key

-- Schedule: every night at 2:00 AM UTC
SELECT cron.schedule(
  'nightly-google-tasks-sync',
  '0 2 * * *',
  $$
  SELECT net.http_post(
    url     := 'https://axcdvkshsujorlgpnzcy.supabase.co/functions/v1/sync-google-tasks',
    headers := jsonb_build_object(
      'Content-Type',  'application/json',
      'Authorization', 'Bearer ' || (
        SELECT decrypted_secret
        FROM vault.decrypted_secrets
        WHERE name = 'service_role_key'
        LIMIT 1
      )
    ),
    body    := '{}'::jsonb
  );
  $$
);
