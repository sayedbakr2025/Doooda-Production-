/*
  # Fix check_doooda_access: handle JSONB plan return, allow users with tokens

  ## Problem
  1. get_user_plan() now returns JSONB instead of text (plan name).
     check_doooda_access was treating it as a text plan name,
     causing "no_plan" for valid users.
  2. Some databases may be missing the is_active column on ai_providers.

  ## Fix
  1. Ensure is_active column exists on ai_providers
  2. Extract plan_code from JSONB result of get_user_plan()
  3. If no limits found in ai_usage_limits, fall back to checking tokens_balance
     - If user has tokens > 0, allow access with plan-based defaults
     - This ensures "no_plan" is never returned for users with tokens
  4. Read daily/monthly limits from plan features JSONB when available
*/

-- ═══════════════════════════════════════════
-- 0. Ensure is_active column exists on ai_providers
-- ═══════════════════════════════════════════
ALTER TABLE ai_providers ADD COLUMN IF NOT EXISTS is_active boolean DEFAULT false;

DO $$
BEGIN
  -- Migrate: if doooda_config has an active_provider_id, set is_active on that row
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'doooda_config' AND column_name = 'active_provider_id') THEN
    UPDATE ai_providers
    SET is_active = true
    WHERE id IN (SELECT active_provider_id FROM doooda_config WHERE active_provider_id IS NOT NULL LIMIT 1);
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS idx_ai_one_active ON ai_providers(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_ai_providers_active ON ai_providers(is_active);

CREATE OR REPLACE FUNCTION public.check_doooda_access()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_plan_raw jsonb;
  v_plan_code text;
  v_daily_limit integer;
  v_monthly_limit integer;
  v_is_unlimited boolean;
  v_daily_used integer;
  v_monthly_used integer;
  v_global_enabled boolean;
  v_disabled_en text;
  v_disabled_ar text;
  v_provider_exists boolean;
  v_tokens_balance integer;
  v_plan_features jsonb;
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

  -- get_user_plan now returns JSONB with plan details
  v_plan_raw := get_user_plan(v_user_id);

  IF v_plan_raw IS NOT NULL THEN
    v_plan_code := v_plan_raw->>'code';
    IF v_plan_code IS NULL THEN
      v_plan_code := LOWER(v_plan_raw->>'name');
    END IF;
    v_plan_features := v_plan_raw->'features';
  ELSE
    v_plan_code := 'free';
    v_plan_features := NULL;
  END IF;

  -- Try user-specific override first
  SELECT daily_limit, monthly_limit, is_unlimited
  INTO v_daily_limit, v_monthly_limit, v_is_unlimited
  FROM ai_usage_limits
  WHERE limit_type = 'user_override'
    AND user_id = v_user_id
    AND is_active = true;

  -- Then try plan-based limits
  IF NOT FOUND THEN
    SELECT daily_limit, monthly_limit, is_unlimited
    INTO v_daily_limit, v_monthly_limit, v_is_unlimited
    FROM ai_usage_limits
    WHERE limit_type = 'plan_based'
      AND plan_name = v_plan_code
      AND is_active = true;
  END IF;

  -- Then try the old plan name format (compatibility)
  IF NOT FOUND THEN
    SELECT daily_limit, monthly_limit, is_unlimited
    INTO v_daily_limit, v_monthly_limit, v_is_unlimited
    FROM ai_usage_limits
    WHERE limit_type = 'plan_based'
      AND is_active = true
      AND (plan_name = v_plan_code OR LOWER(plan_name) = v_plan_code)
    LIMIT 1;
  END IF;

  -- Then try global defaults
  IF NOT FOUND THEN
    SELECT daily_limit, monthly_limit, is_unlimited
    INTO v_daily_limit, v_monthly_limit, v_is_unlimited
    FROM ai_usage_limits
    WHERE limit_type = 'global_default'
      AND is_active = true;
  END IF;

  -- If still no limits found, try reading from plan features JSONB
  IF v_daily_limit IS NULL AND v_monthly_limit IS NULL AND NOT COALESCE(v_is_unlimited, false) THEN
    IF v_plan_features IS NOT NULL THEN
      v_daily_limit := COALESCE((v_plan_features->>'doooda_daily_limit')::integer, NULL);
      v_monthly_limit := COALESCE((v_plan_features->>'doooda_monthly_limit')::integer, NULL);
      v_is_unlimited := COALESCE((v_plan_features->>'is_unlimited')::boolean, false);
    END IF;

    -- Final fallback: if user has tokens, allow access with generous defaults
    IF v_daily_limit IS NULL AND v_monthly_limit IS NULL AND NOT COALESCE(v_is_unlimited, false) THEN
      SELECT tokens_balance INTO v_tokens_balance
      FROM users
      WHERE id = v_user_id;

      IF v_tokens_balance IS NOT NULL AND v_tokens_balance > 0 THEN
        v_daily_limit := 50;
        v_monthly_limit := 500;
      ELSE
        -- User exists but has zero tokens: allow access anyway (error msg will come from ask-doooda)
        v_daily_limit := 5;
        v_monthly_limit := 50;
      END IF;
    END IF;
  END IF;

  IF COALESCE(v_is_unlimited, false) THEN
    RETURN jsonb_build_object('allowed', true, 'plan', v_plan_code, 'unlimited', true);
  END IF;

  IF COALESCE(v_daily_limit, 0) = 0 AND COALESCE(v_monthly_limit, 0) = 0 THEN
    RETURN jsonb_build_object('allowed', false, 'reason', 'plan_no_access', 'plan', v_plan_code);
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
    RETURN jsonb_build_object('allowed', false, 'reason', 'daily_limit', 'plan', v_plan_code, 'daily_used', v_daily_used, 'daily_limit', v_daily_limit);
  END IF;

  IF v_monthly_limit IS NOT NULL AND v_monthly_limit > 0 AND v_monthly_used >= v_monthly_limit THEN
    RETURN jsonb_build_object('allowed', false, 'reason', 'monthly_limit', 'plan', v_plan_code, 'monthly_used', v_monthly_used, 'monthly_limit', v_monthly_limit);
  END IF;

  RETURN jsonb_build_object(
    'allowed', true,
    'plan', v_plan_code,
    'daily_used', v_daily_used,
    'daily_limit', v_daily_limit,
    'monthly_used', v_monthly_used,
    'monthly_limit', v_monthly_limit
  );
END;
$$;