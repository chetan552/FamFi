-- Fixes for the nightly Google Tasks sync cron job from 00014.
-- Re-running this migration is safe: the unschedule is wrapped in an exception
-- handler, and the reschedule replaces the previous job definition.
--
-- Changes vs 00014:
--   * Idempotent (safe to re-apply)
--   * Verifies pg_cron + pg_net are installed
--   * 60s HTTP timeout so a hung function does not pile up requests
--   * Runs at 09:00 UTC (~01:00-02:00 PT) instead of 02:00 UTC (~18:00-19:00 PT)

-- 1. Ensure required extensions exist. CREATE EXTENSION is a no-op if already
--    installed, but it surfaces a clear error if the project has not enabled
--    the pg_cron / pg_net extensions in the Supabase dashboard.
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- 2. Drop any prior schedule with the same name so this migration is rerunnable.
DO $$
BEGIN
  PERFORM cron.unschedule('nightly-google-tasks-sync');
EXCEPTION WHEN OTHERS THEN
  -- No existing job — nothing to unschedule.
  NULL;
END $$;

-- 3. Reschedule with a timeout and an off-peak slot.
SELECT cron.schedule(
  'nightly-google-tasks-sync',
  '0 9 * * *',
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
    body    := '{}'::jsonb,
    timeout_milliseconds := 60000
  );
  $$
);
