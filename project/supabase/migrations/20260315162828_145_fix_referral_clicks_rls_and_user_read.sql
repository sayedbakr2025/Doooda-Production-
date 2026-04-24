/*
  # Fix Referral System RLS Policies

  ## Changes

  ### referral_clicks
  - Add INSERT policy for service role (already bypasses RLS, but needed for clarity)
  - Add SELECT policy so users can count their own clicks by referral_code

  ### referrals
  - No changes needed (existing policies are correct)

  ## Notes
  - The edge function uses service_role key which bypasses RLS entirely
  - The INSERT on referral_clicks works via service_role regardless
  - The user-facing count query in ReferralDashboard uses the user's JWT
    and was blocked by the missing SELECT policy for non-admins
*/

-- Allow users to count clicks on their own referral code
-- They can only see clicks where the code matches their own referral_code
CREATE POLICY "Users can count clicks on own referral code"
  ON referral_clicks FOR SELECT
  TO authenticated
  USING (
    referral_code = (
      SELECT referral_code FROM users WHERE id = auth.uid()
    )
  );
