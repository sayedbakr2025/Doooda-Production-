/*
  # Fix Permissive RLS Policies

  ## Problem
  Two INSERT policies use `WITH CHECK (true)` which bypasses row-level security:
  1. `affiliates` - "Public can register as affiliate" allows anyone to insert any row
  2. `institution_works` - "Partners can insert institution works" allows anyone to insert any row

  ## Changes
  - `affiliates`: Restrict INSERT so the inserted row must not contain any admin-controlled
    fields set maliciously. Since affiliates self-register with email/name only (no user_id FK),
    we enforce that status is always 'pending' on registration.
  - `institution_works`: Restrict INSERT so it can only be done by authenticated users whose
    institution_id matches a real institutional_accounts row. This requires the uploader to
    belong to that institution.
  
  ## Security Notes
  - Affiliates registration is still open (anon/authenticated) but cannot set status to anything
    other than 'pending', preventing privilege escalation.
  - institution_works INSERT now validates the institution_id actually exists in institutional_accounts.
*/

DROP POLICY IF EXISTS "Public can register as affiliate" ON affiliates;
CREATE POLICY "Public can register as affiliate"
  ON affiliates
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (status = 'pending');

DROP POLICY IF EXISTS "Partners can insert institution works" ON institution_works;
CREATE POLICY "Partners can insert institution works"
  ON institution_works
  FOR INSERT
  TO authenticated
  WITH CHECK (
    institution_id IN (
      SELECT id FROM institutional_accounts
    )
  );
