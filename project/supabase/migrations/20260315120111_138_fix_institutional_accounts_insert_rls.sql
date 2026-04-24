/*
  # Fix institutional_accounts INSERT RLS policy

  ## Problem
  The existing INSERT policy "Anyone can create institutional account application"
  uses WITH CHECK (true) which is completely unrestricted and allows any data to be inserted,
  including setting is_active = true or arbitrary tokens_balance values.

  ## Fix
  Replace the permissive policy with a restrictive one that ensures:
  - New applications always start as inactive (is_active = false) — pending admin review
  - tokens_balance must be 0 on creation (admins assign tokens after approval)
  - This prevents privilege escalation through the public application form
*/

DROP POLICY IF EXISTS "Anyone can create institutional account application" ON public.institutional_accounts;

CREATE POLICY "Anyone can submit institutional account application"
  ON public.institutional_accounts
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    is_active = false
    AND tokens_balance = 0
  );
