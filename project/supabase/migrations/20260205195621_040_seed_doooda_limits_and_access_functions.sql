/*
  # Ask Doooda Usage Limits & Access Control

  1. Seed Data
    - Default plan-based limits for FREE, STANDARD, PRO plans
    - FREE: no access (daily_limit=0, monthly_limit=0)
    - STANDARD: 10 daily / 200 monthly
    - PRO: unlimited access

  2. New Functions
    - `get_user_plan(uuid)` - Resolves user's current plan from subscriptions
    - `check_doooda_access()` - Server-side access check with limit enforcement
    - `record_doooda_usage(...)` - Records usage tracking entry

  3. Access Resolution Order
    1. User-specific override (highest priority)
    2. Plan-based limit
    3. Global default
    4. If nothing found: deny (fail-safe)

  4. Security
    - All functions use SECURITY DEFINER to bypass RLS
    - check_doooda_access uses auth.uid() internally
    - record_doooda_usage uses auth.uid() internally
    - No usage data is exposed to the client beyond counts
*/

-- Seed default plan-based limits (only if not already present)
INSERT INTO ai_usage_limits (limit_type, plan_name, daily_limit, monthly_limit, is_unlimited, is_active)
SELECT 'plan_based', 'FREE', 0, 0, false, true
WHERE NOT EXISTS (
  SELECT 1 FROM ai_usage_limits WHERE limit_type = 'plan_based' AND plan_name = 'FREE'
);

INSERT INTO ai_usage_limits (limit_type, plan_name, daily_limit, monthly_limit, is_unlimited, is_active)
SELECT 'plan_based', 'STANDARD', 10, 200, false, true
WHERE NOT EXISTS (
  SELECT 1 FROM ai_usage_limits WHERE limit_type = 'plan_based' AND plan_name = 'STANDARD'
);

INSERT INTO ai_usage_limits (limit_type, plan_name, daily_limit, monthly_limit, is_unlimited, is_active)
SELECT 'plan_based', 'PRO', 0, 0, true, true
WHERE NOT EXISTS (
  SELECT 1 FROM ai_usage_limits WHERE limit_type = 'plan_based' AND plan_name = 'PRO'
);

-- Function: resolve user plan from subscriptions
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

-- Function: check if current user can use Ask Doooda
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
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('allowed', false, 'reason', 'unauthenticated');
  END IF;

  v_plan := get_user_plan(v_user_id);

  -- Priority 1: user-specific override
  SELECT daily_limit, monthly_limit, is_unlimited
  INTO v_daily_limit, v_monthly_limit, v_is_unlimited
  FROM ai_usage_limits
  WHERE limit_type = 'user_override'
    AND user_id = v_user_id
    AND is_active = true;

  -- Priority 2: plan-based limit
  IF NOT FOUND THEN
    SELECT daily_limit, monthly_limit, is_unlimited
    INTO v_daily_limit, v_monthly_limit, v_is_unlimited
    FROM ai_usage_limits
    WHERE limit_type = 'plan_based'
      AND plan_name = v_plan
      AND is_active = true;
  END IF;

  -- Priority 3: global default
  IF NOT FOUND THEN
    SELECT daily_limit, monthly_limit, is_unlimited
    INTO v_daily_limit, v_monthly_limit, v_is_unlimited
    FROM ai_usage_limits
    WHERE limit_type = 'global_default'
      AND is_active = true;
  END IF;

  -- Fail-safe: no limits configured = deny
  IF v_daily_limit IS NULL AND v_monthly_limit IS NULL AND NOT COALESCE(v_is_unlimited, false) THEN
    RETURN jsonb_build_object('allowed', false, 'reason', 'no_plan', 'plan', v_plan);
  END IF;

  -- Unlimited access
  IF COALESCE(v_is_unlimited, false) THEN
    RETURN jsonb_build_object('allowed', true, 'plan', v_plan, 'unlimited', true);
  END IF;

  -- Both limits zero = plan has no access
  IF COALESCE(v_daily_limit, 0) = 0 AND COALESCE(v_monthly_limit, 0) = 0 THEN
    RETURN jsonb_build_object('allowed', false, 'reason', 'plan_no_access', 'plan', v_plan);
  END IF;

  -- Count daily usage
  SELECT COUNT(*) INTO v_daily_used
  FROM ai_usage_tracking
  WHERE user_id = v_user_id
    AND request_timestamp >= date_trunc('day', now() AT TIME ZONE 'UTC')
    AND response_status = 'success';

  -- Count monthly usage
  SELECT COUNT(*) INTO v_monthly_used
  FROM ai_usage_tracking
  WHERE user_id = v_user_id
    AND request_timestamp >= date_trunc('month', now() AT TIME ZONE 'UTC')
    AND response_status = 'success';

  -- Check daily limit
  IF v_daily_limit IS NOT NULL AND v_daily_limit > 0 AND v_daily_used >= v_daily_limit THEN
    RETURN jsonb_build_object('allowed', false, 'reason', 'daily_limit', 'plan', v_plan);
  END IF;

  -- Check monthly limit
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

-- Function: record Ask Doooda usage (called server-side)
CREATE OR REPLACE FUNCTION public.record_doooda_usage(
  p_request_type text DEFAULT 'question',
  p_provider text DEFAULT 'doooda',
  p_status text DEFAULT 'success',
  p_tokens integer DEFAULT 0,
  p_error text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO ai_usage_tracking (user_id, request_type, provider_used, tokens_used, response_status, error_message)
  VALUES (auth.uid(), p_request_type, p_provider, p_tokens, p_status, p_error);
END;
$$;
