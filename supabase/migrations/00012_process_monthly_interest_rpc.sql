-- Migration: Add process_monthly_interest RPC
-- Applies interest and parent-match to every child's bucket in a family.
-- Runs as SECURITY DEFINER to bypass RLS on transactions.
-- Returns the number of interest transactions created.

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
  v_now           TIMESTAMPTZ := NOW();
  v_month         INT := EXTRACT(MONTH FROM v_now)::INT;
  v_year          INT := EXTRACT(YEAR  FROM v_now)::INT;
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
      -- Find the bucket for this child × template × current month
      SELECT *
      INTO   v_bucket
      FROM   public.buckets
      WHERE  child_id    = v_child.id
        AND  template_id = v_setting.template_id
        AND  month       = v_month
        AND  year        = v_year;

      -- Skip if no bucket or balance is zero/negative
      IF v_bucket IS NULL OR v_bucket.cached_balance <= 0 THEN
        CONTINUE;
      END IF;

      -- Calculate interest amount
      v_interest := ROUND(v_bucket.cached_balance * (v_setting.rate_percent / 100.0), 2);

      IF v_interest > 0 THEN
        INSERT INTO public.transactions (bucket_id, child_id, amount, type, description, status)
        VALUES (v_bucket.id, v_child.id, v_interest, 'interest',
                'Monthly interest (' || v_setting.rate_percent || '%)', 'completed');
        v_count := v_count + 1;
      END IF;

      -- Parent match (doubles the interest amount)
      IF v_setting.match_enabled AND v_interest > 0 THEN
        v_match := v_interest;
        INSERT INTO public.transactions (bucket_id, child_id, amount, type, description, status)
        VALUES (v_bucket.id, v_child.id, v_match, 'parent_match',
                'Parent match on interest', 'completed');
        v_count := v_count + 1;
      END IF;

    END LOOP; -- children
  END LOOP;   -- interest settings

  RETURN v_count;
END;
$$;

-- Grant execute to authenticated users (RLS is enforced inside the function)
GRANT EXECUTE ON FUNCTION process_monthly_interest(UUID) TO authenticated;
