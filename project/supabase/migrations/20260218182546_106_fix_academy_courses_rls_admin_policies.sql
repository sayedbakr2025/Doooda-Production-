
/*
  # Fix academy_courses RLS policies for admin insert/update/delete

  ## Problem
  The existing policies use a subquery on the `users` table to check for admin role,
  which can cause issues due to RLS recursion or JWT mismatch.

  ## Fix
  Replace subquery-based admin checks with `auth.jwt()` metadata checks,
  which reads the role directly from the JWT token without hitting the users table.

  ## Changes
  - Drop and recreate INSERT, UPDATE, DELETE policies on academy_courses
  - Also fix SELECT policy so admins can view unpublished courses too
*/

DROP POLICY IF EXISTS "Admins can insert courses" ON academy_courses;
DROP POLICY IF EXISTS "Admins can update courses" ON academy_courses;
DROP POLICY IF EXISTS "Admins can delete courses" ON academy_courses;
DROP POLICY IF EXISTS "Anyone can view published courses" ON academy_courses;

CREATE POLICY "Anyone can view published courses"
  ON academy_courses FOR SELECT
  USING (
    is_published = true
    OR (auth.jwt() ->> 'role') = 'admin'
    OR (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
  );

CREATE POLICY "Admins can insert courses"
  ON academy_courses FOR INSERT
  TO authenticated
  WITH CHECK (
    (auth.jwt() ->> 'role') = 'admin'
    OR (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
    OR EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND (auth.users.raw_app_meta_data ->> 'role') = 'admin'
    )
  );

CREATE POLICY "Admins can update courses"
  ON academy_courses FOR UPDATE
  TO authenticated
  USING (
    (auth.jwt() ->> 'role') = 'admin'
    OR (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
    OR EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND (auth.users.raw_app_meta_data ->> 'role') = 'admin'
    )
  )
  WITH CHECK (
    (auth.jwt() ->> 'role') = 'admin'
    OR (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
    OR EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND (auth.users.raw_app_meta_data ->> 'role') = 'admin'
    )
  );

CREATE POLICY "Admins can delete courses"
  ON academy_courses FOR DELETE
  TO authenticated
  USING (
    (auth.jwt() ->> 'role') = 'admin'
    OR (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
    OR EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND (auth.users.raw_app_meta_data ->> 'role') = 'admin'
    )
  );
