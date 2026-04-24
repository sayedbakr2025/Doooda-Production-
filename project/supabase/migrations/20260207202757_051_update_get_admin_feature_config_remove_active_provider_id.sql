/*
  # Update get_admin_feature_config to remove active_provider_id

  1. Changes
    - Remove active_provider_id from function return value
    - Function now only returns fields actually used by the system
    - Aligns with single source of truth (is_active in ai_providers table)

  2. Purpose
    - Remove confusion from deprecated field
    - Prevent admin UI from accidentally using old field
    - Establish clean separation: doooda_config for global settings, ai_providers for provider settings

  3. Backward Compatibility
    - Function signature unchanged
    - Existing callers will simply not receive active_provider_id field
    - No breaking changes
*/

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
