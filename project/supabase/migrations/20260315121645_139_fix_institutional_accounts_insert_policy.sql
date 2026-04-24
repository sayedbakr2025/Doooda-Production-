/*
  # Fix institutional_accounts INSERT RLS policy

  ## Problem
  The current INSERT policy requires tokens_balance = 0, but the column has DEFAULT 30000.
  When a new application is submitted without explicitly setting tokens_balance, the default
  value of 30000 is used, which violates the policy check.

  ## Fix
  Update the INSERT policy to only enforce is_active = false (pending admin review),
  and remove the tokens_balance check since:
  - The admin can set tokens after approval
  - The default value conflict was causing all applications to fail
  - Security is maintained because is_active = false prevents the account from being used
*/

DROP POLICY IF EXISTS "Anyone can submit institutional account application" ON public.institutional_accounts;

CREATE POLICY "Anyone can submit institutional account application"
  ON public.institutional_accounts
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    is_active = false
  );
