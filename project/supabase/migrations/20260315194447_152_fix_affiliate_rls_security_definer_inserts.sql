/*
  # Fix Affiliate RLS Policies - Remove USING (true) / WITH CHECK (true)

  ## Problem
  The following tables had overly permissive INSERT policies (WITH CHECK = true):
  - affiliate_clicks
  - affiliate_commissions
  - affiliate_conversions
  - affiliate_payouts

  ## Solution
  Drop the permissive "anyone can insert" policies.
  All inserts to these tables are performed by the affiliate-auth edge function
  which uses the SUPABASE_SERVICE_ROLE_KEY, bypassing RLS entirely.
  No permissive policy is needed.

  ## Security Impact
  - Removes unrestricted INSERT access
  - Service role key (used in edge functions) always bypasses RLS
  - Regular authenticated/anonymous users can no longer insert directly
*/

DROP POLICY IF EXISTS "Anyone can insert affiliate clicks" ON affiliate_clicks;
DROP POLICY IF EXISTS "Anyone can insert commissions" ON affiliate_commissions;
DROP POLICY IF EXISTS "Anyone can insert conversions" ON affiliate_conversions;
DROP POLICY IF EXISTS "Anyone can insert payouts" ON affiliate_payouts;
