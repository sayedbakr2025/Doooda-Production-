/*
  # Referral System

  ## Overview
  Creates a complete referral program allowing writers to invite others.
  Both referrer and referred user receive 10,000 tokens on successful signup.

  ## New Tables

  ### referral_clicks
  - Tracks every visit to a referral link
  - Fields: id, referral_code, ip_address, user_agent, clicked_at

  ### referrals
  - Records each referral relationship between users
  - Fields: id, referrer_user_id, referred_user_id, referral_code, status, created_at
  - Status: pending | completed | invalid

  ## Modified Tables

  ### users
  - Adds `referral_code` column (DOOODA-XXXXXX format, auto-generated on signup)

  ## Security
  - RLS enabled on all new tables
  - Users can only read their own referral data
  - Click inserts are done via edge function (service role)
  - Referral completion is triggered via edge function

  ## Notes
  1. referral_code is unique per user, generated automatically
  2. Self-referral is blocked by constraint
  3. Only one completed referral per referred user
*/

-- Add referral_code to users table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'referral_code'
  ) THEN
    ALTER TABLE users ADD COLUMN referral_code text UNIQUE;
  END IF;
END $$;

-- Generate referral codes for existing users
CREATE OR REPLACE FUNCTION generate_referral_code()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  code text;
  attempts int := 0;
BEGIN
  LOOP
    code := 'DOOODA-' || upper(substring(md5(random()::text) from 1 for 6));
    EXIT WHEN NOT EXISTS (SELECT 1 FROM users WHERE referral_code = code);
    attempts := attempts + 1;
    IF attempts > 100 THEN
      RAISE EXCEPTION 'Could not generate unique referral code';
    END IF;
  END LOOP;
  RETURN code;
END;
$$;

-- Populate referral codes for existing users
UPDATE users SET referral_code = generate_referral_code()
WHERE referral_code IS NULL;

-- Auto-generate referral code on new user creation
CREATE OR REPLACE FUNCTION assign_referral_code()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.referral_code IS NULL THEN
    NEW.referral_code := generate_referral_code();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_assign_referral_code ON users;
CREATE TRIGGER trg_assign_referral_code
  BEFORE INSERT ON users
  FOR EACH ROW
  EXECUTE FUNCTION assign_referral_code();

-- referral_clicks table
CREATE TABLE IF NOT EXISTS referral_clicks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  referral_code text NOT NULL,
  ip_address text,
  user_agent text,
  clicked_at timestamptz DEFAULT now()
);

ALTER TABLE referral_clicks ENABLE ROW LEVEL SECURITY;

-- Only admins and service role can read clicks
CREATE POLICY "Admins can read referral clicks"
  ON referral_clicks FOR SELECT
  TO authenticated
  USING (
    (SELECT (auth.jwt() -> 'app_metadata' ->> 'role')) = 'admin'
  );

-- referrals table
CREATE TABLE IF NOT EXISTS referrals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  referred_user_id uuid REFERENCES users(id) ON DELETE SET NULL,
  referral_code text NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'invalid')),
  reward_granted boolean NOT NULL DEFAULT false,
  created_at timestamptz DEFAULT now(),
  completed_at timestamptz,
  CONSTRAINT no_self_referral CHECK (referrer_user_id != referred_user_id),
  CONSTRAINT unique_referred_user UNIQUE (referred_user_id)
);

CREATE INDEX IF NOT EXISTS idx_referrals_referrer ON referrals(referrer_user_id);
CREATE INDEX IF NOT EXISTS idx_referrals_code ON referrals(referral_code);
CREATE INDEX IF NOT EXISTS idx_referrals_status ON referrals(status);
CREATE INDEX IF NOT EXISTS idx_referral_clicks_code ON referral_clicks(referral_code);

ALTER TABLE referrals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own referrals as referrer"
  ON referrals FOR SELECT
  TO authenticated
  USING (auth.uid() = referrer_user_id);

CREATE POLICY "Users can read own referral as referred"
  ON referrals FOR SELECT
  TO authenticated
  USING (auth.uid() = referred_user_id);

CREATE POLICY "Admins can read all referrals"
  ON referrals FOR SELECT
  TO authenticated
  USING (
    (SELECT (auth.jwt() -> 'app_metadata' ->> 'role')) = 'admin'
  );

-- Function to complete a referral and grant tokens
CREATE OR REPLACE FUNCTION complete_referral(p_referred_user_id uuid, p_referral_code text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_referrer_id uuid;
  v_referral_id uuid;
  v_existing_referral uuid;
BEGIN
  -- Find the referrer
  SELECT id INTO v_referrer_id FROM users WHERE referral_code = p_referral_code;
  IF v_referrer_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'invalid_code');
  END IF;

  -- Prevent self-referral
  IF v_referrer_id = p_referred_user_id THEN
    RETURN jsonb_build_object('success', false, 'error', 'self_referral');
  END IF;

  -- Check if referred user already used a referral
  SELECT id INTO v_existing_referral FROM referrals WHERE referred_user_id = p_referred_user_id;
  IF v_existing_referral IS NOT NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'already_referred');
  END IF;

  -- Insert referral record
  INSERT INTO referrals (referrer_user_id, referred_user_id, referral_code, status, reward_granted, completed_at)
  VALUES (v_referrer_id, p_referred_user_id, p_referral_code, 'completed', true, now())
  RETURNING id INTO v_referral_id;

  -- Grant 10000 tokens to referrer
  UPDATE users SET tokens_balance = tokens_balance + 10000 WHERE id = v_referrer_id;

  -- Grant 10000 tokens to referred user
  UPDATE users SET tokens_balance = tokens_balance + 10000 WHERE id = p_referred_user_id;

  -- Log transactions for referrer
  INSERT INTO ai_usage_logs (user_id, feature, tokens_used, provider_id, created_at)
  VALUES (v_referrer_id, 'referral_reward', -10000, null, now());

  -- Log transactions for referred
  INSERT INTO ai_usage_logs (user_id, feature, tokens_used, provider_id, created_at)
  VALUES (p_referred_user_id, 'referral_reward', -10000, null, now());

  RETURN jsonb_build_object('success', true, 'referral_id', v_referral_id);
END;
$$;

-- Function for admin stats
CREATE OR REPLACE FUNCTION get_referral_admin_stats()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_total_referrals int;
  v_completed int;
  v_pending int;
  v_tokens_distributed bigint;
  v_top_referrers jsonb;
BEGIN
  SELECT COUNT(*) INTO v_total_referrals FROM referrals;
  SELECT COUNT(*) INTO v_completed FROM referrals WHERE status = 'completed';
  SELECT COUNT(*) INTO v_pending FROM referrals WHERE status = 'pending';
  SELECT COALESCE(COUNT(*) * 20000, 0) INTO v_tokens_distributed FROM referrals WHERE status = 'completed' AND reward_granted = true;

  SELECT jsonb_agg(row_to_json(t)) INTO v_top_referrers FROM (
    SELECT u.pen_name, u.email, COUNT(r.id) as referral_count
    FROM referrals r
    JOIN users u ON u.id = r.referrer_user_id
    WHERE r.status = 'completed'
    GROUP BY u.id, u.pen_name, u.email
    ORDER BY referral_count DESC
    LIMIT 10
  ) t;

  RETURN jsonb_build_object(
    'total_referrals', v_total_referrals,
    'completed', v_completed,
    'pending', v_pending,
    'tokens_distributed', v_tokens_distributed,
    'top_referrers', COALESCE(v_top_referrers, '[]'::jsonb)
  );
END;
$$;
