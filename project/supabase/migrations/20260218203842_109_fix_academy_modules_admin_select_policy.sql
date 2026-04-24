/*
  # Fix academy_modules admin SELECT policy

  ## Problem
  The current SELECT policy on academy_modules only allows viewing modules
  of published courses. When an admin inserts a module into an unpublished course
  and the query uses .select() after .insert(), the select fails with an RLS error
  because the course is not published.

  ## Fix
  Add a separate SELECT policy for admins that allows them to view all modules
  regardless of whether the course is published.

  ## Changes
  - Add "Admins can view all modules" SELECT policy using JWT-based role check
*/

CREATE POLICY "Admins can view all modules"
  ON academy_modules FOR SELECT
  TO authenticated
  USING ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');
