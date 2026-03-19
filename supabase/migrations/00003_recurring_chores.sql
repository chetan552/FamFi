-- Add recurring chore support to the chores table
ALTER TABLE chores
  ADD COLUMN IF NOT EXISTS is_recurring BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS recurrence_period TEXT CHECK (recurrence_period IN ('daily', 'weekly', 'monthly')) DEFAULT NULL;

-- Comment on new columns
COMMENT ON COLUMN chores.is_recurring IS 'Whether this chore automatically recurs after completion';
COMMENT ON COLUMN chores.recurrence_period IS 'How often the chore recurs: daily, weekly, or monthly';
