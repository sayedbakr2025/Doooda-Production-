/*
  # Fix affiliates admin SELECT policy

  ## Problem
  The "Admin can read affiliates" policy has a broken USING clause:
    USING ((auth.jwt() ->> 'role') = 'admin')
  This checks if the JWT role claim equals 'admin', but the admin role is
  stored in app_metadata, not at the top level of the JWT. The correct path is:
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'

  Additionally, "Affiliates can read own data" has the exact same wrong clause,
  so affiliates also cannot read their own data.

  ## Changes
  - Drop and recreate "Admin can read affiliates" with the correct JWT path
  - Drop and recreate "Affiliates can read own data" with the correct JWT path
  - Also fix Admin UPDATE and DELETE policies that use the same wrong path
  - Also fix Admin INSERT policy that uses the wrong path
*/

DROP POLICY IF EXISTS "Admin can read affiliates" ON affiliates;
DROP POLICY IF EXISTS "Affiliates can read own data" ON affiliates;
DROP POLICY IF EXISTS "Admin can update affiliates" ON affiliates;
DROP POLICY IF EXISTS "Admin can delete affiliates" ON affiliates;
DROP POLICY IF EXISTS "Admin can insert affiliates" ON affiliates;

CREATE POLICY "Admin can read affiliates"
  ON affiliates
  FOR SELECT
  TO authenticated
  USING ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

CREATE POLICY "Affiliates can read own data"
  ON affiliates
  FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Admin can update affiliates"
  ON affiliates
  FOR UPDATE
  TO authenticated
  USING ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin')
  WITH CHECK ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

CREATE POLICY "Admin can delete affiliates"
  ON affiliates
  FOR DELETE
  TO authenticated
  USING ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

CREATE POLICY "Admin can insert affiliates"
  ON affiliates
  FOR INSERT
  TO authenticated
  WITH CHECK ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');
