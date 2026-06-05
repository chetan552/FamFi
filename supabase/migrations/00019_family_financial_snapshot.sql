-- Family financial snapshot helpers for the Flutter client.
--
-- These functions return the same financial data the app already needs, but
-- aggregate it on the database side and validate family access once. This
-- avoids client-side balance gaps when buckets span multiple months.

CREATE OR REPLACE FUNCTION public.get_family_bucket_balances()
RETURNS TABLE (
  child_id UUID,
  template_id UUID,
  balance NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_family_id UUID;
BEGIN
  SELECT u.family_id
  INTO v_family_id
  FROM public.users u
  WHERE u.auth_id = auth.uid()
  LIMIT 1;

  IF v_family_id IS NULL THEN
    RAISE EXCEPTION 'Authenticated user is not linked to a family';
  END IF;

  RETURN QUERY
  SELECT
    b.child_id,
    b.template_id,
    COALESCE(SUM(b.cached_balance), 0.00) AS balance
  FROM public.buckets b
  JOIN public.users child ON child.id = b.child_id
  WHERE child.family_id = v_family_id
    AND child.role = 'child'
  GROUP BY b.child_id, b.template_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_family_recent_transactions(p_limit INT DEFAULT 100)
RETURNS TABLE (
  id UUID,
  bucket_id UUID,
  child_id UUID,
  amount NUMERIC,
  type transaction_type,
  description TEXT,
  status transaction_status,
  created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_family_id UUID;
BEGIN
  SELECT u.family_id
  INTO v_family_id
  FROM public.users u
  WHERE u.auth_id = auth.uid()
  LIMIT 1;

  IF v_family_id IS NULL THEN
    RAISE EXCEPTION 'Authenticated user is not linked to a family';
  END IF;

  RETURN QUERY
  SELECT
    t.id,
    t.bucket_id,
    t.child_id,
    t.amount,
    t.type,
    t.description,
    t.status,
    t.created_at
  FROM public.transactions t
  JOIN public.users child ON child.id = t.child_id
  WHERE child.family_id = v_family_id
  ORDER BY t.created_at DESC
  LIMIT LEAST(GREATEST(p_limit, 1), 500);
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_family_bucket_balances() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_family_recent_transactions(INT) TO authenticated;
