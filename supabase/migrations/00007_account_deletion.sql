CREATE OR REPLACE FUNCTION delete_user()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  uid UUID;
BEGIN
  uid := auth.uid();
  IF uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Delete families created by the user (Cascades to all users, chores, buckets etc)
  DELETE FROM public.families WHERE created_by = uid;

  -- Delete the public user row (in case they joined a family but didn't create it)
  DELETE FROM public.users WHERE auth_id = uid;

  -- Finally, delete the auth.users row
  DELETE FROM auth.users WHERE id = uid;
END;
$$;
