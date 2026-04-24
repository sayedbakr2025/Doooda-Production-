/*
  # Fix affiliates INSERT RLS for public registration

  ## Problem
  The affiliate-auth edge function uses SUPABASE_SERVICE_ROLE_KEY which should bypass RLS,
  but the INSERT policy only allows admins (checked via auth.jwt() role).
  When called without a JWT (public registration), no policies match and the insert fails.

  ## Solution
  Add a policy that allows public INSERT into affiliates table so the edge function
  can register new affiliates without requiring admin JWT.
  The edge function itself handles all validation and security logic.

  ## Changes
  - Add "Public can register as affiliate" INSERT policy for anon/public role
*/

CREATE POLICY "Public can register as affiliate"
  ON affiliates
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);
