
/*
  # Fix academy_courses RLS - use JWT only, no subqueries

  ## Problem
  Previous fix added EXISTS subquery on auth.users which causes "permission denied for table users".

  ## Fix
  Use only auth.jwt() checks without any subqueries to avoid permission issues.
  Admin role is stored in app_metadata.role in the JWT token.
*/

DROP POLICY IF EXISTS "Admins can insert courses" ON academy_courses;
DROP POLICY IF EXISTS "Admins can update courses" ON academy_courses;
DROP POLICY IF EXISTS "Admins can delete courses" ON academy_courses;
DROP POLICY IF EXISTS "Anyone can view published courses" ON academy_courses;

CREATE POLICY "Anyone can view published courses"
  ON academy_courses FOR SELECT
  USING (
    is_published = true
    OR ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin')
  );

CREATE POLICY "Admins can insert courses"
  ON academy_courses FOR INSERT
  TO authenticated
  WITH CHECK (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
  );

CREATE POLICY "Admins can update courses"
  ON academy_courses FOR UPDATE
  TO authenticated
  USING (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
  )
  WITH CHECK (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
  );

CREATE POLICY "Admins can delete courses"
  ON academy_courses FOR DELETE
  TO authenticated
  USING (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
  );
