/*
  # Fix ai_providers RLS policies for INSERT and DELETE

  1. Problem
    - The existing "Admin can manage AI providers" FOR ALL policy checks
      `auth.jwt() ->> 'role' = 'admin'`, but Supabase JWT role is always
      'authenticated' for authenticated users, so this policy never matches.
    - INSERT and DELETE operations were blocked because no working policies
      covered them.

  2. Changes
    - Drop the broken FOR ALL policy that checks JWT role
    - Add INSERT policy using is_admin()
    - Add DELETE policy using is_admin()

  3. Security
    - Only admins (verified via public.users.role) can insert/delete providers
    - Existing SELECT and UPDATE policies using is_admin() remain unchanged
*/

DROP POLICY IF EXISTS "Admin can manage AI providers" ON ai_providers;

CREATE POLICY "Admins can insert ai_providers"
  ON ai_providers
  FOR INSERT
  TO authenticated
  WITH CHECK (is_admin());

CREATE POLICY "Admins can delete ai_providers"
  ON ai_providers
  FOR DELETE
  TO authenticated
  USING (is_admin());
