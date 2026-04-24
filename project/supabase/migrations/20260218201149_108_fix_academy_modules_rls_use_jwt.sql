/*
  # Fix academy_modules RLS policies to use JWT instead of users table subquery

  ## Problem
  The existing INSERT/UPDATE/DELETE policies on academy_modules check admin role
  by querying the users table with a subquery. This can fail due to RLS on the
  users table itself causing permission issues or recursion.

  ## Fix
  Replace subquery-based admin checks with JWT metadata checks using
  auth.jwt() -> 'app_metadata' -> 'role' which reads directly from the token
  without requiring a table query.

  ## Changes
  - Drop existing admin policies for INSERT, UPDATE, DELETE on academy_modules
  - Recreate them using JWT-based role check
*/

DROP POLICY IF EXISTS "Admins can insert modules" ON academy_modules;
DROP POLICY IF EXISTS "Admins can update modules" ON academy_modules;
DROP POLICY IF EXISTS "Admins can delete modules" ON academy_modules;

CREATE POLICY "Admins can insert modules"
  ON academy_modules FOR INSERT
  TO authenticated
  WITH CHECK ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

CREATE POLICY "Admins can update modules"
  ON academy_modules FOR UPDATE
  TO authenticated
  USING ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin')
  WITH CHECK ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

CREATE POLICY "Admins can delete modules"
  ON academy_modules FOR DELETE
  TO authenticated
  USING ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');
