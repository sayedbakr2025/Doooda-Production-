/*
  # Affiliate Marketing System

  ## Overview
  Full affiliate program infrastructure allowing marketers/influencers to promote Doooda
  and earn commissions on paid plan purchases.

  ## New Tables
  1. `affiliates` - Affiliate accounts (application, approval, profile)
  2. `affiliate_clicks` - Click tracking per referral link
  3. `affiliate_conversions` - Conversion events (signup, purchase)
  4. `affiliate_commissions` - Earned commission records
  5. `affiliate_payouts` - Payout requests and history
  6. `affiliate_coupons` - Coupon codes assigned to affiliates

  ## Security
  - RLS enabled on all tables
  - Custom auth via password_hash (same pattern as institutional_accounts)
  - Admin access via JWT role check
*/

-- ============================================================
-- AFFILIATES TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS affiliates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  email text UNIQUE NOT NULL,
  password_hash text NOT NULL,
  website text,
  social_links jsonb DEFAULT '{}',
  promotion_method text,
  country text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'suspended')),
  rejection_reason text,
  referral_code text UNIQUE NOT NULL,
  commission_type text NOT NULL DEFAULT 'percentage' CHECK (commission_type IN ('percentage', 'fixed')),
  commission_value numeric(10,2) NOT NULL DEFAULT 20.00,
  minimum_payout numeric(10,2) NOT NULL DEFAULT 50.00,
  total_clicks integer NOT NULL DEFAULT 0,
  total_signups integer NOT NULL DEFAULT 0,
  total_conversions integer NOT NULL DEFAULT 0,
  total_revenue numeric(10,2) NOT NULL DEFAULT 0,
  total_commission_earned numeric(10,2) NOT NULL DEFAULT 0,
  total_commission_paid numeric(10,2) NOT NULL DEFAULT 0,
  is_flagged boolean NOT NULL DEFAULT false,
  flag_reason text,
  payout_method text DEFAULT 'paypal' CHECK (payout_method IN ('paypal', 'bank_transfer', 'wise', 'crypto')),
  payout_details jsonb DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE affiliates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Affiliates can read own data"
  ON affiliates FOR SELECT
  TO authenticated
  USING ((auth.jwt() ->> 'role') = 'admin');

CREATE POLICY "Admin can read affiliates"
  ON affiliates FOR SELECT
  USING ((auth.jwt() ->> 'role') = 'admin');

CREATE POLICY "Admin can insert affiliates"
  ON affiliates FOR INSERT
  WITH CHECK ((auth.jwt() ->> 'role') = 'admin');

CREATE POLICY "Admin can update affiliates"
  ON affiliates FOR UPDATE
  USING ((auth.jwt() ->> 'role') = 'admin')
  WITH CHECK ((auth.jwt() ->> 'role') = 'admin');

CREATE POLICY "Admin can delete affiliates"
  ON affiliates FOR DELETE
  USING ((auth.jwt() ->> 'role') = 'admin');

CREATE INDEX IF NOT EXISTS idx_affiliates_email ON affiliates(email);
CREATE INDEX IF NOT EXISTS idx_affiliates_referral_code ON affiliates(referral_code);
CREATE INDEX IF NOT EXISTS idx_affiliates_status ON affiliates(status);

-- ============================================================
-- AFFILIATE CLICKS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS affiliate_clicks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  affiliate_id uuid NOT NULL REFERENCES affiliates(id) ON DELETE CASCADE,
  ip_address text,
  user_agent text,
  referrer text,
  landing_page text,
  country text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE affiliate_clicks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin can read affiliate clicks"
  ON affiliate_clicks FOR SELECT
  USING ((auth.jwt() ->> 'role') = 'admin');

CREATE POLICY "Anyone can insert affiliate clicks"
  ON affiliate_clicks FOR INSERT
  WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_affiliate_clicks_affiliate_id ON affiliate_clicks(affiliate_id);
CREATE INDEX IF NOT EXISTS idx_affiliate_clicks_created_at ON affiliate_clicks(created_at);

-- ============================================================
-- AFFILIATE CONVERSIONS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS affiliate_conversions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  affiliate_id uuid NOT NULL REFERENCES affiliates(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  event_type text NOT NULL CHECK (event_type IN ('signup', 'subscription', 'token_purchase')),
  plan_name text,
  amount numeric(10,2),
  currency text DEFAULT 'USD',
  metadata jsonb DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE affiliate_conversions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin can read conversions"
  ON affiliate_conversions FOR SELECT
  USING ((auth.jwt() ->> 'role') = 'admin');

CREATE POLICY "Anyone can insert conversions"
  ON affiliate_conversions FOR INSERT
  WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_affiliate_conversions_affiliate_id ON affiliate_conversions(affiliate_id);
CREATE INDEX IF NOT EXISTS idx_affiliate_conversions_user_id ON affiliate_conversions(user_id);
CREATE INDEX IF NOT EXISTS idx_affiliate_conversions_event_type ON affiliate_conversions(event_type);

-- ============================================================
-- AFFILIATE COMMISSIONS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS affiliate_commissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  affiliate_id uuid NOT NULL REFERENCES affiliates(id) ON DELETE CASCADE,
  conversion_id uuid REFERENCES affiliate_conversions(id) ON DELETE SET NULL,
  amount numeric(10,2) NOT NULL,
  currency text DEFAULT 'USD',
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'paid', 'cancelled')),
  description text,
  paid_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE affiliate_commissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin can read commissions"
  ON affiliate_commissions FOR SELECT
  USING ((auth.jwt() ->> 'role') = 'admin');

CREATE POLICY "Admin can update commissions"
  ON affiliate_commissions FOR UPDATE
  USING ((auth.jwt() ->> 'role') = 'admin')
  WITH CHECK ((auth.jwt() ->> 'role') = 'admin');

CREATE POLICY "Anyone can insert commissions"
  ON affiliate_commissions FOR INSERT
  WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_affiliate_commissions_affiliate_id ON affiliate_commissions(affiliate_id);
CREATE INDEX IF NOT EXISTS idx_affiliate_commissions_status ON affiliate_commissions(status);

-- ============================================================
-- AFFILIATE PAYOUTS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS affiliate_payouts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  affiliate_id uuid NOT NULL REFERENCES affiliates(id) ON DELETE CASCADE,
  amount numeric(10,2) NOT NULL,
  currency text DEFAULT 'USD',
  method text NOT NULL DEFAULT 'paypal' CHECK (method IN ('paypal', 'bank_transfer', 'wise', 'crypto')),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'rejected')),
  payout_details jsonb DEFAULT '{}',
  admin_notes text,
  processed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE affiliate_payouts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin can read payouts"
  ON affiliate_payouts FOR SELECT
  USING ((auth.jwt() ->> 'role') = 'admin');

CREATE POLICY "Admin can update payouts"
  ON affiliate_payouts FOR UPDATE
  USING ((auth.jwt() ->> 'role') = 'admin')
  WITH CHECK ((auth.jwt() ->> 'role') = 'admin');

CREATE POLICY "Anyone can insert payouts"
  ON affiliate_payouts FOR INSERT
  WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_affiliate_payouts_affiliate_id ON affiliate_payouts(affiliate_id);
CREATE INDEX IF NOT EXISTS idx_affiliate_payouts_status ON affiliate_payouts(status);

-- ============================================================
-- AFFILIATE COUPONS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS affiliate_coupons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  affiliate_id uuid NOT NULL REFERENCES affiliates(id) ON DELETE CASCADE,
  code text UNIQUE NOT NULL,
  discount_type text NOT NULL DEFAULT 'percentage' CHECK (discount_type IN ('percentage', 'fixed')),
  discount_value numeric(10,2) NOT NULL,
  usage_count integer NOT NULL DEFAULT 0,
  usage_limit integer,
  is_active boolean NOT NULL DEFAULT true,
  expires_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE affiliate_coupons ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin can read coupons"
  ON affiliate_coupons FOR SELECT
  USING ((auth.jwt() ->> 'role') = 'admin');

CREATE POLICY "Admin can insert coupons"
  ON affiliate_coupons FOR INSERT
  WITH CHECK ((auth.jwt() ->> 'role') = 'admin');

CREATE POLICY "Admin can update coupons"
  ON affiliate_coupons FOR UPDATE
  USING ((auth.jwt() ->> 'role') = 'admin')
  WITH CHECK ((auth.jwt() ->> 'role') = 'admin');

CREATE POLICY "Admin can delete coupons"
  ON affiliate_coupons FOR DELETE
  USING ((auth.jwt() ->> 'role') = 'admin');

CREATE POLICY "Anyone can read active coupons for validation"
  ON affiliate_coupons FOR SELECT
  USING (is_active = true);

CREATE INDEX IF NOT EXISTS idx_affiliate_coupons_code ON affiliate_coupons(code);
CREATE INDEX IF NOT EXISTS idx_affiliate_coupons_affiliate_id ON affiliate_coupons(affiliate_id);

-- ============================================================
-- HELPER FUNCTION: generate unique referral code
-- ============================================================
CREATE OR REPLACE FUNCTION generate_referral_code()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  code text;
  exists_check boolean;
BEGIN
  LOOP
    code := 'AFF' || upper(substring(md5(random()::text || clock_timestamp()::text) from 1 for 6));
    SELECT EXISTS(SELECT 1 FROM affiliates WHERE referral_code = code) INTO exists_check;
    EXIT WHEN NOT exists_check;
  END LOOP;
  RETURN code;
END;
$$;
