-- Ensure every user has a plan and get_user_plan always returns a valid result
-- Problem: if user has no plan or plan column is null/empty, get_user_plan returns
-- error: 'no_plans_found', which causes check_doooda_access to say no_plan.
-- Fix: 1) Backfill all users to 'free' if they have no plan
--       2) Default plan column to 'free' (should already be, but enforce)
--       3) Fix get_user_plan to use free plan defaults as ultimate fallback

-- ═══════════════════════════════════════════
-- 1. Backfill any user with null/empty plan
-- ═══════════════════════════════════════════
UPDATE users SET plan = 'free' WHERE plan IS NULL OR plan = '';
UPDATE users SET plan_code = 'free' WHERE plan_code IS NULL OR plan_code = '';

-- Ensure default on column
ALTER TABLE users ALTER COLUMN plan SET DEFAULT 'free';

-- ═══════════════════════════════════════════
-- 2. Fix get_user_plan to ALWAYS return valid JSONB
--    If no match found anywhere, return free plan hardcoded defaults
-- ═══════════════════════════════════════════
CREATE OR REPLACE FUNCTION get_user_plan(p_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_code text;
  v_name text;
  v_name_ar text;
  v_name_en text;
  v_tokens_initial integer;
  v_tokens_recurring integer;
  v_allow_token_purchase boolean;
  v_monthly_tokens integer;
  v_multiplier numeric;
  v_price numeric;
  v_price_monthly numeric;
  v_features jsonb;
  v_max_token_cap integer;
  v_user_plan text;
BEGIN
  -- Get user's plan string
  SELECT COALESCE(plan_code, LOWER(plan), 'free') INTO v_user_plan
  FROM users WHERE id = p_user_id;

  -- Try exact match by code or name
  SELECT p.code, p.name, p.name_ar, p.name_en,
         p.tokens_initial, p.tokens_recurring, p.allow_token_purchase,
         p.monthly_tokens, p.multiplier, p.price, p.price_monthly, p.features, p.max_token_cap
  INTO v_code, v_name, v_name_ar, v_name_en,
       v_tokens_initial, v_tokens_recurring, v_allow_token_purchase,
       v_monthly_tokens, v_multiplier, v_price, v_price_monthly, v_features, v_max_token_cap
  FROM plans p
  WHERE LOWER(p.code) = LOWER(v_user_plan)
     OR LOWER(p.name) = LOWER(v_user_plan)
  LIMIT 1;

  -- If still no match, try 'free' plan
  IF v_code IS NULL THEN
    SELECT p.code, p.name, p.name_ar, p.name_en,
           p.tokens_initial, p.tokens_recurring, p.allow_token_purchase,
           p.monthly_tokens, p.multiplier, p.price, p.price_monthly, p.features, p.max_token_cap
    INTO v_code, v_name, v_name_ar, v_name_en,
         v_tokens_initial, v_tokens_recurring, v_allow_token_purchase,
         v_monthly_tokens, v_multiplier, v_price, v_price_monthly, v_features, v_max_token_cap
    FROM plans p
    WHERE LOWER(p.name) = 'free' OR LOWER(p.code) = 'free'
    LIMIT 1;
  END IF;

  -- Ultimate fallback: hardcoded free plan (plans table might be empty)
  IF v_code IS NULL THEN
    RETURN jsonb_build_object(
      'code', 'free',
      'name', 'free',
      'name_ar', 'كاتب هاوي',
      'name_en', 'Hobbyist Writer',
      'tokens_initial', 10000,
      'tokens_recurring', 0,
      'allow_token_purchase', false,
      'multiplier', 1.0,
      'features', '{"academy": true, "competitions": true, "max_projects": 3, "export_pdf": false, "export_word": false, "marketing": false, "doooda_daily_limit": 5, "doooda_monthly_limit": 50, "doooda_max_tokens": 1000, "doooda_context_budget": 800}'::jsonb,
      'max_token_cap', 200000
    );
  END IF;

  RETURN jsonb_build_object(
    'code', v_code,
    'name', v_name,
    'name_ar', v_name_ar,
    'name_en', v_name_en,
    'tokens_initial', v_tokens_initial,
    'tokens_recurring', v_tokens_recurring,
    'allow_token_purchase', v_allow_token_purchase,
    'monthly_tokens', v_monthly_tokens,
    'multiplier', v_multiplier,
    'price', v_price,
    'price_monthly', v_price_monthly,
    'features', COALESCE(v_features, '{}'::jsonb),
    'max_token_cap', v_max_token_cap
  );
END;
$$;

-- ═══════════════════════════════════════════
-- 3. Fix check_doooda_access to treat any unknown reason
--    (including no_active_provider) as "still show the button"
--    Remove 'no_active_provider' from gating — the chat will handle it
-- ═══════════════════════════════════════════
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

  -- get_user_plan always returns valid JSONB now
  v_plan_raw := get_user_plan(v_user_id);

  IF v_plan_raw IS NOT NULL THEN
    v_plan_code := v_plan_raw->>'code';
    IF v_plan_code IS NULL THEN
      v_plan_code := 'free';
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

    -- Final fallback: user always has a plan, use sensible defaults
    IF v_daily_limit IS NULL AND v_monthly_limit IS NULL AND NOT COALESCE(v_is_unlimited, false) THEN
      -- Free plan defaults
      v_daily_limit := 5;
      v_monthly_limit := 50;
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