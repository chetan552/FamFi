-- Fix process_monthly_interest to apply interest across ALL bucket months,
-- not just the current month. This handles balances from previous payday runs.

CREATE OR REPLACE FUNCTION process_monthly_interest(p_family_id UUID)
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_role   user_role;
  v_caller_family UUID;
  v_child         RECORD;
  v_setting       RECORD;
  v_bucket        RECORD;
  v_interest      NUMERIC;
  v_match         NUMERIC;
  v_count         INT := 0;
BEGIN
  -- Verify caller is an authenticated parent in this family
  SELECT role, family_id
  INTO v_caller_role, v_caller_family
  FROM public.users
  WHERE auth_id = auth.uid()
  LIMIT 1;

  IF v_caller_role IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  IF v_caller_role != 'parent' THEN
    RAISE EXCEPTION 'Only parents can process interest';
  END IF;
  IF v_caller_family != p_family_id THEN
    RAISE EXCEPTION 'You do not belong to this family';
  END IF;

  -- Loop over every interest setting for this family
  FOR v_setting IN
    SELECT s.template_id, s.rate_percent, s.match_enabled
    FROM   interest_settings s
    WHERE  s.family_id = p_family_id
      AND  s.rate_percent > 0
  LOOP
    -- For every child in this family
    FOR v_child IN
      SELECT id FROM public.users
      WHERE  family_id = p_family_id AND role = 'child'
    LOOP
      -- Apply interest to EVERY bucket for this child × template that has a positive balance
      -- (not filtered by month/year so historical buckets are included)
      FOR v_bucket IN
        SELECT *
        FROM   public.buckets
        WHERE  child_id    = v_child.id
          AND  template_id = v_setting.template_id
          AND  cached_balance > 0
      LOOP
        v_interest := ROUND(v_bucket.cached_balance * (v_setting.rate_percent / 100.0), 2);

        IF v_interest > 0 THEN
          INSERT INTO public.transactions (bucket_id, child_id, amount, type, description, status)
          VALUES (v_bucket.id, v_child.id, v_interest, 'interest',
                  'Monthly interest (' || v_setting.rate_percent || '%)', 'completed');
          v_count := v_count + 1;
        END IF;

        -- Parent match doubles the interest
        IF v_setting.match_enabled AND v_interest > 0 THEN
          v_match := v_interest;
          INSERT INTO public.transactions (bucket_id, child_id, amount, type, description, status)
          VALUES (v_bucket.id, v_child.id, v_match, 'parent_match',
                  'Parent match on interest', 'completed');
          v_count := v_count + 1;
        END IF;

      END LOOP; -- buckets
    END LOOP;   -- children
  END LOOP;     -- interest settings

  RETURN v_count;
END;
$$;

GRANT EXECUTE ON FUNCTION process_monthly_interest(UUID) TO authenticated;
