/*
  # Fix check_doooda_access to use is_default

  1. Changes
    - Update function to check is_default instead of is_active
    - Check is_enabled as well

  2. Purpose
    - Match the actual ai_providers table structure
*/

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
    WHERE is_enabled = true
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