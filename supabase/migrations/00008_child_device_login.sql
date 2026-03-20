CREATE OR REPLACE FUNCTION get_children_by_invite(p_invite_code TEXT)
RETURNS TABLE (id UUID, name TEXT, avatar_emoji TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_family_id UUID;
BEGIN
  SELECT f.id INTO v_family_id FROM public.families f WHERE f.invite_code = upper(p_invite_code);
  IF v_family_id IS NULL THEN
    RAISE EXCEPTION 'Invalid invite code';
  END IF;

  RETURN QUERY
  SELECT u.id, u.name, u.avatar_emoji
  FROM public.users u
  WHERE u.family_id = v_family_id AND u.role = 'child';
END;
$$;

CREATE OR REPLACE FUNCTION link_child_account(p_invite_code TEXT, p_child_id UUID)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_family_id UUID;
  v_auth_id UUID;
BEGIN
  v_auth_id := auth.uid();
  IF v_auth_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated (needs anonymous session)';
  END IF;

  SELECT f.id INTO v_family_id FROM public.families f WHERE f.invite_code = upper(p_invite_code);
  IF v_family_id IS NULL THEN
    RAISE EXCEPTION 'Invalid invite code';
  END IF;

  UPDATE public.users
  SET auth_id = v_auth_id
  WHERE id = p_child_id
    AND family_id = v_family_id
    AND role = 'child';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Child not found or already linked';
  END IF;

  RETURN TRUE;
END;
$$;
