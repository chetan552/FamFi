-- Persist the default reward at the family level so it survives browser
-- refreshes, device changes, and other parents joining the same family.

ALTER TABLE public.families
  ADD COLUMN IF NOT EXISTS default_chore_reward NUMERIC(10,2) NOT NULL DEFAULT 5.00;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'families_default_chore_reward_nonnegative'
      AND conrelid = 'public.families'::regclass
  ) THEN
    ALTER TABLE public.families
      ADD CONSTRAINT families_default_chore_reward_nonnegative
        CHECK (default_chore_reward >= 0);
  END IF;
END $$;
