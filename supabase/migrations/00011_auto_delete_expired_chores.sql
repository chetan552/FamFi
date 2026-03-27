-- Migration: Auto-delete chores that were assigned but not completed by their due date.
-- NOTE: pg_cron scheduling is done manually via the Supabase Dashboard after enabling
-- the pg_cron extension. This migration only creates the function.

-- ============================================================
-- Function: delete_expired_chores
-- ============================================================
-- Deletes any chore that:
--   • has status = 'assigned' (child has not submitted it as done)
--   • has a due_date set AND that date is strictly in the past
-- Chores with status 'done' (submitted, pending parent approval) are KEPT.
-- Chores with no due_date are KEPT (open-ended chores).

CREATE OR REPLACE FUNCTION delete_expired_chores()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_deleted integer;
BEGIN
  DELETE FROM public.chores
  WHERE status = 'assigned'
    AND due_date IS NOT NULL
    AND due_date < CURRENT_DATE;

  GET DIAGNOSTICS v_deleted = ROW_COUNT;
  RETURN v_deleted;
END;
$$;

