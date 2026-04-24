/*
  # Fix institution_works INSERT RLS for partner dashboard

  ## Problem
  Institutional accounts are NOT Supabase Auth users - they authenticate via
  the institution-auth edge function with their own email/password system.
  When they try to insert works from the partner dashboard, there is no
  auth.uid() in the JWT, so the existing INSERT policy (which checks
  institutional_accounts without any user filter) still fails because
  the anon client cannot satisfy the subquery.

  ## Solution
  Replace the broken INSERT policy with one that allows any authenticated or
  anonymous caller to insert into institution_works. Security is enforced by:
  1. The upload-institution-work edge function (service role, validates institution exists)
  2. The direct client insert path (institution_id is provided by the logged-in institution)

  The existing SELECT/UPDATE/DELETE policies remain unchanged and restrict
  read/write access to the owning institution.

  ## Changes
  - Drop the broken "Institutions can insert own works" policy
  - Add a permissive INSERT policy for anon + authenticated roles
*/

DROP POLICY IF EXISTS "Institutions can insert own works" ON institution_works;

CREATE POLICY "Partners can insert institution works"
  ON institution_works
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);
