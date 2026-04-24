/*
  # Create resolve_user_state function for runtime enforcement

  1. New Function
    - `resolve_user_state()` - Single source of truth for user state resolution
    - Returns comprehensive user state including plan, limits, overrides, and feature access
    - Called at runtime on every protected action

  2. Purpose
    - Ensures all feature access decisions come from the database
    - Applies user-specific overrides over plan defaults
    - Provides complete state for runtime enforcement
    - No caching - always fresh data

  3. Security
    - SECURITY DEFINER to bypass RLS
    - Uses auth.uid() to ensure caller is authenticated
*/

CREATE OR REPLACE FUNCTION public.resolve_user_state()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_user_record record;
  v_plan text;
  v_plan_start timestamptz;
  v_plan_end timestamptz;
  v_limits record;
  v_override record;
  v_result jsonb;
BEGIN
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object(
      'authenticated', false,
      'error', 'unauthenticated'
    );
  END IF;

  SELECT id, email, is_active, created_at
  INTO v_user_record
  FROM users
  WHERE id = v_user_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'authenticated', true,
      'error', 'user_not_found'
    );
  END IF;

  v_plan := get_user_plan(v_user_id);

  SELECT plan_start_date, plan_end_date
  INTO v_plan_start, v_plan_end
  FROM users
  WHERE id = v_user_id;

  SELECT daily_limit, monthly_limit, is_unlimited, model_override
  INTO v_override
  FROM ai_usage_limits
  WHERE limit_type = 'user_override'
    AND user_id = v_user_id
    AND is_active = true
  LIMIT 1;

  IF v_override.daily_limit IS NOT NULL THEN
    v_limits := v_override;
  ELSE
    SELECT daily_limit, monthly_limit, is_unlimited, model_override
    INTO v_limits
    FROM ai_usage_limits
    WHERE limit_type = 'plan_based'
      AND plan_name = v_plan
      AND is_active = true
    LIMIT 1;
  END IF;

  IF v_limits.daily_limit IS NULL THEN
    SELECT daily_limit, monthly_limit, is_unlimited, model_override
    INTO v_limits
    FROM ai_usage_limits
    WHERE limit_type = 'global_default'
      AND is_active = true
    LIMIT 1;
  END IF;

  v_result := jsonb_build_object(
    'authenticated', true,
    'user_id', v_user_id,
    'email', v_user_record.email,
    'is_active', v_user_record.is_active,
    'plan', v_plan,
    'plan_start', v_plan_start,
    'plan_end', v_plan_end,
    'daily_limit', COALESCE(v_limits.daily_limit, 0),
    'monthly_limit', COALESCE(v_limits.monthly_limit, 0),
    'is_unlimited', COALESCE(v_limits.is_unlimited, false),
    'model_override', v_limits.model_override,
    'has_user_override', (v_override.daily_limit IS NOT NULL)
  );

  RETURN v_result;
END;
$$;

COMMENT ON FUNCTION public.resolve_user_state() IS 'Runtime user state resolution with plan and limit overrides. Single source of truth for feature access enforcement.';
