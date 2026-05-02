-- Track which parent created each Google Task mapping so the sync function can
-- use the correct user's OAuth token. Without this, a mapping connected by
-- parent A could be synced with parent B's token and silently fail (B has no
-- access to A's task list).
--
-- The column is nullable: existing rows stay NULL, and the sync function falls
-- back to "any parent in the family with a valid token" for those rows.

ALTER TABLE google_task_mappings
  ADD COLUMN IF NOT EXISTS created_by_user_id UUID
    REFERENCES users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_google_task_mappings_created_by
  ON google_task_mappings(created_by_user_id)
  WHERE created_by_user_id IS NOT NULL;
