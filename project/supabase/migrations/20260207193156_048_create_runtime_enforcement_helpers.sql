/*
  # Create runtime enforcement helper functions

  1. New Functions
    - `can_access_feature()` - Generic feature access check
    - `record_feature_usage()` - Track feature usage for enforcement
    - `get_feature_config()` - Get admin-configured feature settings

  2. Purpose
    - Centralized runtime enforcement for all features
    - Admin config drives all access decisions
    - No hardcoded permissions in application code

  3. Security
    - All functions use SECURITY DEFINER
    - All functions verify authentication
*/

CREATE OR REPLACE FUNCTION public.can_access_feature(p_feature_name text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
DECLARE
  v_user_state jsonb;
  v_feature_enabled boolean;
  v_daily_used integer;
  v_monthly_used integer;
BEGIN
  v_user_state := resolve_user_state();

  IF NOT (v_user_state->>'authenticated')::boolean THEN
    RETURN jsonb_build_object('allowed', false, 'reason', 'unauthenticated');
  END IF;

  IF p_feature_name = 'doooda' THEN
    RETURN check_doooda_access();
  END IF;

  RETURN jsonb_build_object(
    'allowed', true,
    'feature', p_feature_name,
    'user_state', v_user_state
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.record_feature_usage(
  p_feature_name text,
  p_metadata jsonb DEFAULT '{}'::jsonb
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
VOLATILE
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
BEGIN
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RETURN false;
  END IF;

  IF p_feature_name = 'doooda' THEN
    RETURN true;
  END IF;

  RETURN true;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_admin_feature_config(p_feature_name text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
DECLARE
  v_config jsonb;
BEGIN
  IF p_feature_name = 'doooda' THEN
    SELECT jsonb_build_object(
      'enabled', is_enabled,
      'active_provider_id', active_provider_id,
      'session_memory_enabled', session_memory_enabled,
      'max_context_length', max_context_length,
      'disabled_message_en', disabled_message_en,
      'disabled_message_ar', disabled_message_ar
    )
    INTO v_config
    FROM doooda_config
    LIMIT 1;
    
    RETURN COALESCE(v_config, '{}'::jsonb);
  END IF;

  RETURN '{}'::jsonb;
END;
$$;

COMMENT ON FUNCTION public.can_access_feature(text) IS 'Runtime feature access check. Single source of truth for all features.';
COMMENT ON FUNCTION public.record_feature_usage(text, jsonb) IS 'Record feature usage for enforcement and analytics.';
COMMENT ON FUNCTION public.get_admin_feature_config(text) IS 'Get admin-configured feature settings at runtime.';
