/*
  # Fix Academy Challenge Submissions Admin RLS Policies

  ## Summary
  Replaces the admin SELECT and UPDATE policies on academy_challenge_submissions
  to use JWT app_metadata instead of a subquery on the users table.
  This avoids potential recursion and aligns with the pattern used elsewhere.

  ## Changes
  - Drop old admin SELECT policy (uses users table subquery)
  - Drop old admin UPDATE policy (uses users table subquery)
  - Recreate both using auth.jwt() -> 'app_metadata' ->> 'role' = 'admin'
*/

DROP POLICY IF EXISTS "Admins can read all challenge submissions" ON academy_challenge_submissions;
DROP POLICY IF EXISTS "Admins can update challenge submissions" ON academy_challenge_submissions;

CREATE POLICY "Admins can read all challenge submissions"
  ON academy_challenge_submissions FOR SELECT
  TO authenticated
  USING ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

CREATE POLICY "Admins can update challenge submissions"
  ON academy_challenge_submissions FOR UPDATE
  TO authenticated
  USING ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin')
  WITH CHECK ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');
