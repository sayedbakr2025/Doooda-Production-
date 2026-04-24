/*
  # Fix institution_token_purchases RLS INSERT policy

  ## Problem
  The existing INSERT policy uses `WITH CHECK (true)` which allows anyone (anon or authenticated)
  to insert any purchase request without restriction.

  ## Fix
  - Drop the permissive INSERT policy
  - Add a restrictive INSERT policy that only allows authenticated admins to insert directly
  - Institution purchase requests should go through an edge function (SECURITY DEFINER)
    that validates the institution identity before inserting

  ## Security
  - Direct INSERT from anon/non-admin is now blocked
  - Admins can insert on behalf of institutions
  - Edge functions use service role key and bypass RLS as needed
*/

DROP POLICY IF EXISTS "Institutions can insert own purchase requests" ON public.institution_token_purchases;

CREATE POLICY "Admins can insert purchase records"
  ON public.institution_token_purchases
  FOR INSERT
  TO authenticated
  WITH CHECK (
    (SELECT (auth.jwt()->'app_metadata'->>'role')) = 'admin'
  );
