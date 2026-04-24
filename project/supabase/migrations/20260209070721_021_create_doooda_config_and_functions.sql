/*
  # Create Doooda Config and Access Functions

  1. New Tables
    - `doooda_config` - Global doooda settings
    - `subscriptions` - User subscriptions (temporary for free users)
    - `price_versions` - Plan definitions

  2. New Functions
    - `get_user_plan()` - Returns user's current plan
    - `check_doooda_access()` - Checks if user can use doooda

  3. Security
    - Enable RLS on all tables
    - Add policies for authenticated users
*/

-- Create doooda_config table
CREATE TABLE IF NOT EXISTS doooda_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  is_enabled boolean DEFAULT true,
  disabled_message_en text DEFAULT '',
  disabled_message_ar text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE doooda_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage doooda config"
  ON doooda_config FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

-- Insert default config
INSERT INTO doooda_config (is_enabled)
SELECT true
WHERE NOT EXISTS (SELECT 1 FROM doooda_config);

-- Create price_versions table (for plans)
CREATE TABLE IF NOT EXISTS price_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_name text NOT NULL,
  active_until timestamptz,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE price_versions ENABLE ROW LEVEL SECURITY;

-- Create subscriptions table
CREATE TABLE IF NOT EXISTS subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  price_version_id uuid REFERENCES price_versions(id) ON DELETE CASCADE NOT NULL,
  status text DEFAULT 'ACTIVE',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own subscriptions"
  ON subscriptions FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Insert FREE plan
INSERT INTO price_versions (plan_name)
SELECT 'FREE'
WHERE NOT EXISTS (SELECT 1 FROM price_versions WHERE plan_name = 'FREE');

-- Function: get user plan
CREATE OR REPLACE FUNCTION public.get_user_plan(p_user_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
DECLARE
  v_plan text;
BEGIN
  SELECT pv.plan_name INTO v_plan
  FROM subscriptions s
  JOIN price_versions pv ON pv.id = s.price_version_id
  WHERE s.user_id = p_user_id
    AND s.status = 'ACTIVE'
    AND (pv.active_until IS NULL OR pv.active_until > now())
  ORDER BY s.created_at DESC
  LIMIT 1;

  RETURN COALESCE(v_plan, 'FREE');
END;
$$;

-- Function: check doooda access
CREATE OR REPLACE FUNCTION public.check_doooda_access()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_plan text;
  v_daily_limit integer;
  v_monthly_limit integer;
  v_is_unlimited boolean;
  v_daily_used integer;
  v_monthly_used integer;
  v_global_enabled boolean;
  v_disabled_en text;
  v_disabled_ar text;
  v_provider_exists boolean;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('allowed', false, 'reason', 'unauthenticated');
  END IF;

  SELECT is_enabled, disabled_message_en, disabled_message_ar
  INTO v_global_enabled, v_disabled_en, v_disabled_ar
  FROM doooda_config
  LIMIT 1;

  IF NOT COALESCE(v_global_enabled, true) THEN
    RETURN jsonb_build_object(
      'allowed', false,
      'reason', 'globally_disabled',
      'disabled_message_en', COALESCE(v_disabled_en, ''),
      'disabled_message_ar', COALESCE(v_disabled_ar, '')
    );
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM ai_providers
    WHERE is_active = true
      AND is_enabled = true
      AND api_key_encrypted IS NOT NULL
      AND api_key_encrypted <> ''
  ) INTO v_provider_exists;

  IF NOT v_provider_exists THEN
    RETURN jsonb_build_object('allowed', false, 'reason', 'no_active_provider');
  END IF;

  v_plan := get_user_plan(v_user_id);

  SELECT daily_limit, monthly_limit, is_unlimited
  INTO v_daily_limit, v_monthly_limit, v_is_unlimited
  FROM ai_usage_limits
  WHERE limit_type = 'user_override'
    AND user_id = v_user_id
    AND is_active = true;

  IF NOT FOUND THEN
    SELECT daily_limit, monthly_limit, is_unlimited
    INTO v_daily_limit, v_monthly_limit, v_is_unlimited
    FROM ai_usage_limits
    WHERE limit_type = 'plan_based'
      AND plan_name = v_plan
      AND is_active = true;
  END IF;

  IF NOT FOUND THEN
    SELECT daily_limit, monthly_limit, is_unlimited
    INTO v_daily_limit, v_monthly_limit, v_is_unlimited
    FROM ai_usage_limits
    WHERE limit_type = 'global_default'
      AND is_active = true;
  END IF;

  IF v_daily_limit IS NULL AND v_monthly_limit IS NULL AND NOT COALESCE(v_is_unlimited, false) THEN
    RETURN jsonb_build_object('allowed', false, 'reason', 'no_plan', 'plan', v_plan);
  END IF;

  IF COALESCE(v_is_unlimited, false) THEN
    RETURN jsonb_build_object('allowed', true, 'plan', v_plan, 'unlimited', true);
  END IF;

  IF COALESCE(v_daily_limit, 0) = 0 AND COALESCE(v_monthly_limit, 0) = 0 THEN
    RETURN jsonb_build_object('allowed', false, 'reason', 'plan_no_access', 'plan', v_plan);
  END IF;

  SELECT COUNT(*) INTO v_daily_used
  FROM ai_usage_tracking
  WHERE user_id = v_user_id
    AND request_timestamp >= date_trunc('day', now() AT TIME ZONE 'UTC')
    AND response_status = 'success';

  SELECT COUNT(*) INTO v_monthly_used
  FROM ai_usage_tracking
  WHERE user_id = v_user_id
    AND request_timestamp >= date_trunc('month', now() AT TIME ZONE 'UTC')
    AND response_status = 'success';

  IF v_daily_limit IS NOT NULL AND v_daily_limit > 0 AND v_daily_used >= v_daily_limit THEN
    RETURN jsonb_build_object('allowed', false, 'reason', 'daily_limit', 'plan', v_plan);
  END IF;

  IF v_monthly_limit IS NOT NULL AND v_monthly_limit > 0 AND v_monthly_used >= v_monthly_limit THEN
    RETURN jsonb_build_object('allowed', false, 'reason', 'monthly_limit', 'plan', v_plan);
  END IF;

  RETURN jsonb_build_object(
    'allowed', true,
    'plan', v_plan,
    'daily_used', v_daily_used,
    'daily_limit', v_daily_limit,
    'monthly_used', v_monthly_used,
    'monthly_limit', v_monthly_limit
  );
END;
$$;