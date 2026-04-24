/*
  # Fix users admin read policy

  The current policy checks `auth.jwt() ->> 'role'` which returns 'authenticated' for all users.
  The actual admin role is stored in `raw_app_meta_data` as `app_metadata.role`.
  
  This migration fixes the SELECT policy for admins to correctly read app_metadata from the JWT.
*/

DROP POLICY IF EXISTS "users_admin_read_policy" ON users;

CREATE POLICY "users_admin_read_policy"
  ON users
  FOR SELECT
  TO authenticated
  USING (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
    OR id = auth.uid()
  );
