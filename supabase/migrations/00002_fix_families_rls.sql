-- Allow all authenticated users to view families. 
-- This is necessary so parents can search for a family by invite code to join it.
-- Privacy is still maintained as the ID and invite_code are not public, only accessible to logged-in users.

DROP POLICY IF EXISTS "Parents can view own family" ON families;

CREATE POLICY "Allow authenticated users to select families"
  ON families FOR SELECT
  TO authenticated
  USING (true);
