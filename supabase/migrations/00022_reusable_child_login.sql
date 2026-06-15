-- Treat the family link code as the kid login credential. Kids should remain
-- selectable after their profile has been used on another anonymous session.

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

  IF NOT EXISTS (
    SELECT 1
    FROM public.users
    WHERE id = p_child_id
      AND family_id = v_family_id
      AND role = 'child'
  ) THEN
    RAISE EXCEPTION 'Child not found for this family';
  END IF;

  UPDATE public.users
  SET auth_id = NULL
  WHERE auth_id = v_auth_id
    AND id <> p_child_id
    AND family_id = v_family_id
    AND role = 'child';

  UPDATE public.users
  SET auth_id = v_auth_id
  WHERE id = p_child_id
    AND family_id = v_family_id
    AND role = 'child';

  RETURN TRUE;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_children_by_invite(TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.link_child_account(TEXT, UUID) TO anon, authenticated;
