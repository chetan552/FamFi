-- Tighten access controls around family membership, child login, and financial data.

-- Families should not be globally listable by every authenticated user. Joining
-- by invite code is handled by the join_family_by_invite RPC below.
DROP POLICY IF EXISTS "Allow authenticated users to select families" ON public.families;
DROP POLICY IF EXISTS "Parents can view own family" ON public.families;
CREATE POLICY "Users can view own family"
  ON public.families FOR SELECT
  TO authenticated
  USING (
    created_by = auth.uid()
    OR (
      public.get_my_role() = 'parent'
      AND id = public.get_my_family_id()
    )
  );

DROP POLICY IF EXISTS "Authenticated users can create families" ON public.families;
CREATE POLICY "Authenticated users can create owned families"
  ON public.families FOR INSERT
  TO authenticated
  WITH CHECK (created_by = auth.uid());

-- Direct clients may edit display/profile fields, but not identity or membership
-- fields. Controlled membership changes happen through SECURITY DEFINER RPCs.
CREATE OR REPLACE FUNCTION public.prevent_client_user_identity_changes()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF current_user IN ('authenticated', 'anon') THEN
    IF NEW.auth_id IS DISTINCT FROM OLD.auth_id
      OR NEW.role IS DISTINCT FROM OLD.role
      OR NEW.family_id IS DISTINCT FROM OLD.family_id THEN
      RAISE EXCEPTION 'Cannot update protected user identity fields directly';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_client_user_identity_changes ON public.users;
CREATE TRIGGER trg_prevent_client_user_identity_changes
BEFORE UPDATE OF auth_id, role, family_id ON public.users
FOR EACH ROW
EXECUTE FUNCTION public.prevent_client_user_identity_changes();

DROP POLICY IF EXISTS "Users can insert own profile" ON public.users;
CREATE POLICY "Users can insert own parent profile"
  ON public.users FOR INSERT
  TO authenticated
  WITH CHECK (
    auth_id = auth.uid()
    AND role = 'parent'
    AND family_id IS NULL
  );

DROP POLICY IF EXISTS "Parents can insert children" ON public.users;
CREATE POLICY "Parents can insert unlinked children"
  ON public.users FOR INSERT
  TO authenticated
  WITH CHECK (
    family_id = public.get_my_family_id()
    AND public.get_my_role() = 'parent'
    AND role = 'child'
    AND auth_id IS NULL
  );

DROP POLICY IF EXISTS "Users can view family members" ON public.users;
CREATE POLICY "Users can view scoped profiles"
  ON public.users FOR SELECT
  TO authenticated
  USING (
    auth_id = auth.uid()
    OR (
      public.get_my_role() = 'parent'
      AND family_id = public.get_my_family_id()
    )
  );

DROP POLICY IF EXISTS "Parents can update family users" ON public.users;
CREATE POLICY "Users can update own basic profile"
  ON public.users FOR UPDATE
  TO authenticated
  USING (auth_id = auth.uid())
  WITH CHECK (
    auth_id = auth.uid()
    AND role = public.get_my_role()
    AND family_id IS NOT DISTINCT FROM public.get_my_family_id()
  );

CREATE POLICY "Parents can update child basic profiles"
  ON public.users FOR UPDATE
  TO authenticated
  USING (
    public.get_my_role() = 'parent'
    AND family_id = public.get_my_family_id()
    AND role = 'child'
  )
  WITH CHECK (
    public.get_my_role() = 'parent'
    AND family_id = public.get_my_family_id()
    AND role = 'child'
  );

-- Prevent children from altering chore rewards/details while marking their own
-- chores done. Parents keep the existing broader update policy.
CREATE OR REPLACE FUNCTION public.prevent_child_chore_field_changes()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF current_user IN ('authenticated', 'anon')
    AND public.get_my_role() = 'child' THEN
    IF OLD.status <> 'assigned'
      OR NEW.status <> 'done'
      OR NEW.id IS DISTINCT FROM OLD.id
      OR NEW.family_id IS DISTINCT FROM OLD.family_id
      OR NEW.assigned_to_child_id IS DISTINCT FROM OLD.assigned_to_child_id
      OR NEW.title IS DISTINCT FROM OLD.title
      OR NEW.value IS DISTINCT FROM OLD.value
      OR NEW.due_date IS DISTINCT FROM OLD.due_date
      OR NEW.is_recurring IS DISTINCT FROM OLD.is_recurring
      OR NEW.recurrence_period IS DISTINCT FROM OLD.recurrence_period
      OR NEW.google_task_id IS DISTINCT FROM OLD.google_task_id
      OR NEW.source IS DISTINCT FROM OLD.source
      OR NEW.created_at IS DISTINCT FROM OLD.created_at THEN
      RAISE EXCEPTION 'Children can only mark their own assigned chores as done';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_child_chore_field_changes ON public.chores;
CREATE TRIGGER trg_prevent_child_chore_field_changes
BEFORE UPDATE ON public.chores
FOR EACH ROW
EXECUTE FUNCTION public.prevent_child_chore_field_changes();

DROP POLICY IF EXISTS "Children can mark own chores done" ON public.chores;
CREATE POLICY "Children can mark own chores done"
  ON public.chores FOR UPDATE
  TO authenticated
  USING (
    assigned_to_child_id = public.get_my_user_id()
    AND public.get_my_role() = 'child'
    AND status = 'assigned'
  )
  WITH CHECK (
    assigned_to_child_id = public.get_my_user_id()
    AND family_id = public.get_my_family_id()
    AND status = 'done'
  );

-- Scope child visibility to their own financial records while parents retain
-- whole-family access.
DROP POLICY IF EXISTS "Parents can view all family buckets" ON public.buckets;
CREATE POLICY "Users can view scoped buckets"
  ON public.buckets FOR SELECT
  TO authenticated
  USING (
    child_id = public.get_my_user_id()
    OR (
      public.get_my_role() = 'parent'
      AND child_id IN (
        SELECT id FROM public.users WHERE family_id = public.get_my_family_id()
      )
    )
  );

DROP POLICY IF EXISTS "Parents can view family transactions" ON public.transactions;
CREATE POLICY "Users can view scoped transactions"
  ON public.transactions FOR SELECT
  TO authenticated
  USING (
    child_id = public.get_my_user_id()
    OR (
      public.get_my_role() = 'parent'
      AND child_id IN (
        SELECT id FROM public.users WHERE family_id = public.get_my_family_id()
      )
    )
  );

DROP POLICY IF EXISTS "Parents can insert transactions" ON public.transactions;
CREATE POLICY "Parents can insert family transactions"
  ON public.transactions FOR INSERT
  TO authenticated
  WITH CHECK (
    public.get_my_role() = 'parent'
    AND child_id IN (
      SELECT id FROM public.users WHERE family_id = public.get_my_family_id()
    )
    AND EXISTS (
      SELECT 1
      FROM public.buckets b
      WHERE b.id = bucket_id
        AND b.child_id = transactions.child_id
    )
  );

DROP POLICY IF EXISTS "Family members can view chores" ON public.chores;
CREATE POLICY "Users can view scoped chores"
  ON public.chores FOR SELECT
  TO authenticated
  USING (
    assigned_to_child_id = public.get_my_user_id()
    OR (
      public.get_my_role() = 'parent'
      AND family_id = public.get_my_family_id()
    )
  );

-- Google integration is parent-only and token rows are limited to the owner.
DROP POLICY IF EXISTS "Users can manage own tokens" ON public.google_tokens;
CREATE POLICY "Parents can manage own Google tokens"
  ON public.google_tokens FOR ALL
  TO authenticated
  USING (
    public.get_my_role() = 'parent'
    AND user_id = public.get_my_user_id()
  )
  WITH CHECK (
    public.get_my_role() = 'parent'
    AND user_id = public.get_my_user_id()
  );

DROP POLICY IF EXISTS "Family members can manage mappings" ON public.google_task_mappings;
CREATE POLICY "Parents can manage family Google mappings"
  ON public.google_task_mappings FOR ALL
  TO authenticated
  USING (
    public.get_my_role() = 'parent'
    AND family_id = public.get_my_family_id()
  )
  WITH CHECK (
    public.get_my_role() = 'parent'
    AND family_id = public.get_my_family_id()
    AND child_id IN (
      SELECT id
      FROM public.users
      WHERE family_id = public.get_my_family_id()
        AND role = 'child'
    )
    AND (
      created_by_user_id IS NULL
      OR created_by_user_id = public.get_my_user_id()
    )
  );

CREATE OR REPLACE FUNCTION public.attach_created_family(p_family_id UUID)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_auth_id UUID;
  v_profile_id UUID;
  v_role public.user_role;
  v_current_family_id UUID;
BEGIN
  v_auth_id := auth.uid();
  IF v_auth_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT id, role, family_id
  INTO v_profile_id, v_role, v_current_family_id
  FROM public.users
  WHERE auth_id = v_auth_id
  LIMIT 1;

  IF v_profile_id IS NULL OR v_role <> 'parent' THEN
    RAISE EXCEPTION 'Only parent profiles can create families';
  END IF;

  IF v_current_family_id IS NOT NULL AND v_current_family_id <> p_family_id THEN
    RAISE EXCEPTION 'Profile is already linked to a different family';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.families
    WHERE id = p_family_id
      AND created_by = v_auth_id
  ) THEN
    RAISE EXCEPTION 'Family was not created by the current user';
  END IF;

  UPDATE public.users
  SET family_id = p_family_id
  WHERE id = v_profile_id;

  RETURN p_family_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.join_family_by_invite(p_invite_code TEXT)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_auth_id UUID;
  v_profile_id UUID;
  v_role public.user_role;
  v_current_family_id UUID;
  v_family_id UUID;
BEGIN
  v_auth_id := auth.uid();
  IF v_auth_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT id, role, family_id
  INTO v_profile_id, v_role, v_current_family_id
  FROM public.users
  WHERE auth_id = v_auth_id
  LIMIT 1;

  IF v_profile_id IS NULL OR v_role <> 'parent' THEN
    RAISE EXCEPTION 'Only parent profiles can join families';
  END IF;

  SELECT id
  INTO v_family_id
  FROM public.families
  WHERE invite_code = upper(trim(p_invite_code))
  LIMIT 1;

  IF v_family_id IS NULL THEN
    RAISE EXCEPTION 'Invalid invite code';
  END IF;

  IF v_current_family_id IS NOT NULL AND v_current_family_id <> v_family_id THEN
    RAISE EXCEPTION 'Profile is already linked to a different family';
  END IF;

  UPDATE public.users
  SET family_id = v_family_id
  WHERE id = v_profile_id;

  RETURN v_family_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.attach_created_family(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.join_family_by_invite(TEXT) TO authenticated;

-- Child profiles can be claimed once. Returning only unlinked children avoids
-- exposing already-linked child names through invite-code lookups.
CREATE OR REPLACE FUNCTION public.get_children_by_invite(p_invite_code TEXT)
RETURNS TABLE (id UUID, name TEXT, avatar_emoji TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_family_id UUID;
BEGIN
  SELECT f.id
  INTO v_family_id
  FROM public.families f
  WHERE f.invite_code = upper(trim(p_invite_code))
  LIMIT 1;

  IF v_family_id IS NULL THEN
    RAISE EXCEPTION 'Invalid invite code';
  END IF;

  RETURN QUERY
  SELECT u.id, u.name, u.avatar_emoji
  FROM public.users u
  WHERE u.family_id = v_family_id
    AND u.role = 'child'
    AND u.auth_id IS NULL
  ORDER BY u.created_at ASC;
END;
$$;

CREATE OR REPLACE FUNCTION public.link_child_account(p_invite_code TEXT, p_child_id UUID)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_family_id UUID;
  v_auth_id UUID;
BEGIN
  v_auth_id := auth.uid();
  IF v_auth_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated (needs anonymous session)';
  END IF;

  SELECT f.id
  INTO v_family_id
  FROM public.families f
  WHERE f.invite_code = upper(trim(p_invite_code))
  LIMIT 1;

  IF v_family_id IS NULL THEN
    RAISE EXCEPTION 'Invalid invite code';
  END IF;

  UPDATE public.users
  SET auth_id = v_auth_id
  WHERE id = p_child_id
    AND family_id = v_family_id
    AND role = 'child'
    AND auth_id IS NULL;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Child not found or already linked';
  END IF;

  RETURN TRUE;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_children_by_invite(TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.link_child_account(TEXT, UUID) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.process_payday(
  p_child_id UUID,
  p_bucket_amounts JSONB,
  p_chore_ids UUID[]
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_role public.user_role;
  v_caller_family_id UUID;
  v_child_family_id UUID;
  v_entry JSONB;
  v_bucket_id UUID;
  v_amount NUMERIC;
BEGIN
  SELECT role, family_id
  INTO v_caller_role, v_caller_family_id
  FROM public.users
  WHERE auth_id = auth.uid()
  LIMIT 1;

  IF v_caller_role IS NULL THEN
    RAISE EXCEPTION 'Not authenticated or user profile not found';
  END IF;

  IF v_caller_role <> 'parent' THEN
    RAISE EXCEPTION 'Only parents can run payday';
  END IF;

  SELECT family_id
  INTO v_child_family_id
  FROM public.users
  WHERE id = p_child_id
    AND role = 'child';

  IF v_child_family_id IS NULL OR v_child_family_id <> v_caller_family_id THEN
    RAISE EXCEPTION 'Child not found in your family';
  END IF;

  FOR v_entry IN SELECT * FROM jsonb_array_elements(p_bucket_amounts)
  LOOP
    v_bucket_id := (v_entry->>'bucket_id')::UUID;
    v_amount := (v_entry->>'amount')::NUMERIC;

    IF v_amount > 0 THEN
      IF NOT EXISTS (
        SELECT 1
        FROM public.buckets
        WHERE id = v_bucket_id
          AND child_id = p_child_id
      ) THEN
        RAISE EXCEPTION 'Bucket does not belong to the selected child';
      END IF;

      INSERT INTO public.transactions (bucket_id, child_id, amount, type, description, status)
      VALUES (v_bucket_id, p_child_id, v_amount, 'chore_earning', 'Payday Distribution', 'completed');
    END IF;
  END LOOP;

  IF array_length(p_chore_ids, 1) > 0 THEN
    UPDATE public.chores
    SET status = 'paid'
    WHERE id = ANY(p_chore_ids)
      AND family_id = v_caller_family_id
      AND assigned_to_child_id = p_child_id;
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.process_payday(UUID, JSONB, UUID[]) TO authenticated;

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
  v_user_id UUID;
  v_family_id UUID;
  v_role public.user_role;
BEGIN
  SELECT u.id, u.family_id, u.role
  INTO v_user_id, v_family_id, v_role
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
    AND (v_role = 'parent' OR child.id = v_user_id)
  GROUP BY b.child_id, b.template_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_family_recent_transactions(p_limit INT DEFAULT 100)
RETURNS TABLE (
  id UUID,
  bucket_id UUID,
  child_id UUID,
  amount NUMERIC,
  type public.transaction_type,
  description TEXT,
  status public.transaction_status,
  created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_family_id UUID;
  v_role public.user_role;
BEGIN
  SELECT u.id, u.family_id, u.role
  INTO v_user_id, v_family_id, v_role
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
    AND (v_role = 'parent' OR child.id = v_user_id)
  ORDER BY t.created_at DESC
  LIMIT LEAST(GREATEST(p_limit, 1), 500);
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_family_bucket_balances() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_family_recent_transactions(INT) TO authenticated;

ALTER FUNCTION public.delete_user() SET search_path = public;
ALTER FUNCTION public.get_my_family_id() SET search_path = public;
ALTER FUNCTION public.get_my_role() SET search_path = public;
ALTER FUNCTION public.get_my_user_id() SET search_path = public;
ALTER FUNCTION public.delete_expired_chores() SET search_path = public;
