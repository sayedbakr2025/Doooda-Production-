/*
  # Doooda Admin Configuration & Persona Versioning

  1. New Tables
    - `doooda_config` (singleton row)
      - `id` (uuid, primary key)
      - `is_enabled` (boolean) - global on/off toggle for Ask Doooda
      - `active_provider_id` (uuid, FK to ai_providers) - which AI provider is active
      - `session_memory_enabled` (boolean) - whether session memory is on
      - `max_context_length` (integer) - max tokens/chars per session context
      - `cooldown_seconds` (integer) - optional cooldown between questions
      - `disabled_message_en` (text) - message shown when Doooda is disabled (EN)
      - `disabled_message_ar` (text) - message shown when Doooda is disabled (AR)
      - `updated_at` (timestamptz)
      - `updated_by` (uuid, FK to users)

    - `doooda_persona_versions`
      - `id` (uuid, primary key)
      - `version` (integer) - auto-incremented version number
      - `persona_prompt_en` (text) - English persona prompt
      - `persona_prompt_ar` (text) - Arabic persona prompt
      - `guardrails_en` (text) - English guardrails
      - `guardrails_ar` (text) - Arabic guardrails
      - `is_active` (boolean) - only one version can be active
      - `is_locked` (boolean) - prevents accidental edits
      - `created_by` (uuid, FK to users)
      - `created_at` (timestamptz)
      - `notes` (text) - admin notes about this version

  2. New Functions
    - `get_doooda_config()` - returns current config (public, cached)
    - `get_doooda_analytics()` - admin-only analytics aggregates

  3. Security
    - RLS enabled on both tables
    - Config readable by authenticated users (needed for access checks)
    - Config writable only by admins
    - Persona versions readable/writable only by admins

  4. Updates
    - `check_doooda_access()` updated to respect global toggle
*/

-- ────────────────────────
-- doooda_config (singleton)
-- ────────────────────────
CREATE TABLE IF NOT EXISTS doooda_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  is_enabled boolean NOT NULL DEFAULT true,
  active_provider_id uuid REFERENCES ai_providers(id),
  session_memory_enabled boolean NOT NULL DEFAULT true,
  max_context_length integer NOT NULL DEFAULT 4000,
  cooldown_seconds integer NOT NULL DEFAULT 0,
  disabled_message_en text NOT NULL DEFAULT 'This feature is currently unavailable. Please try again later.',
  disabled_message_ar text NOT NULL DEFAULT 'هذه الميزة غير متاحة حاليًا. يرجى المحاولة لاحقًا.',
  updated_at timestamptz DEFAULT now(),
  updated_by uuid REFERENCES users(id)
);

ALTER TABLE doooda_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read doooda config"
  ON doooda_config FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can update doooda config"
  ON doooda_config FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

-- Seed singleton row
INSERT INTO doooda_config (is_enabled, session_memory_enabled, max_context_length, cooldown_seconds)
SELECT true, true, 4000, 0
WHERE NOT EXISTS (SELECT 1 FROM doooda_config);

-- ────────────────────────
-- doooda_persona_versions
-- ────────────────────────
CREATE TABLE IF NOT EXISTS doooda_persona_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  version integer NOT NULL DEFAULT 1,
  persona_prompt_en text NOT NULL DEFAULT '',
  persona_prompt_ar text NOT NULL DEFAULT '',
  guardrails_en text NOT NULL DEFAULT '',
  guardrails_ar text NOT NULL DEFAULT '',
  is_active boolean NOT NULL DEFAULT false,
  is_locked boolean NOT NULL DEFAULT false,
  created_by uuid REFERENCES users(id),
  created_at timestamptz DEFAULT now(),
  notes text DEFAULT ''
);

ALTER TABLE doooda_persona_versions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can read persona versions"
  ON doooda_persona_versions FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

CREATE POLICY "Admins can insert persona versions"
  ON doooda_persona_versions FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

CREATE POLICY "Admins can update persona versions"
  ON doooda_persona_versions FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

-- ────────────────────────
-- Add questions_per_session to ai_usage_limits
-- ────────────────────────
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'ai_usage_limits' AND column_name = 'questions_per_session'
  ) THEN
    ALTER TABLE ai_usage_limits ADD COLUMN questions_per_session integer DEFAULT 0;
  END IF;
END $$;

-- ────────────────────────
-- Add model_per_plan to ai_usage_limits
-- ────────────────────────
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'ai_usage_limits' AND column_name = 'model_override'
  ) THEN
    ALTER TABLE ai_usage_limits ADD COLUMN model_override text DEFAULT NULL;
  END IF;
END $$;

-- ────────────────────────
-- get_doooda_config() - lightweight config fetch
-- ────────────────────────
CREATE OR REPLACE FUNCTION public.get_doooda_config()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
DECLARE
  v_config record;
BEGIN
  SELECT
    dc.is_enabled,
    dc.session_memory_enabled,
    dc.max_context_length,
    dc.cooldown_seconds,
    dc.disabled_message_en,
    dc.disabled_message_ar,
    ap.provider_name AS active_provider_name,
    ap.is_enabled AS provider_healthy
  INTO v_config
  FROM doooda_config dc
  LEFT JOIN ai_providers ap ON ap.id = dc.active_provider_id
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('is_enabled', false);
  END IF;

  RETURN jsonb_build_object(
    'is_enabled', v_config.is_enabled,
    'session_memory_enabled', v_config.session_memory_enabled,
    'max_context_length', v_config.max_context_length,
    'cooldown_seconds', v_config.cooldown_seconds,
    'disabled_message_en', v_config.disabled_message_en,
    'disabled_message_ar', v_config.disabled_message_ar,
    'provider_healthy', COALESCE(v_config.provider_healthy, false)
  );
END;
$$;

-- ────────────────────────
-- Update check_doooda_access to respect global toggle
-- ────────────────────────
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
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('allowed', false, 'reason', 'unauthenticated');
  END IF;

  -- Check global toggle
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

-- ────────────────────────
-- get_doooda_analytics() - admin only
-- ────────────────────────
CREATE OR REPLACE FUNCTION public.get_doooda_analytics()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
DECLARE
  v_admin_id uuid;
  v_total_requests bigint;
  v_today_requests bigint;
  v_month_requests bigint;
  v_active_users bigint;
  v_provider_dist jsonb;
  v_plan_dist jsonb;
  v_filtered bigint;
  v_rate_limited bigint;
BEGIN
  v_admin_id := auth.uid();
  IF v_admin_id IS NULL THEN
    RETURN jsonb_build_object('error', 'unauthenticated');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM users WHERE id = v_admin_id AND role = 'admin') THEN
    RETURN jsonb_build_object('error', 'unauthorized');
  END IF;

  SELECT COUNT(*) INTO v_total_requests FROM ai_usage_tracking;

  SELECT COUNT(*) INTO v_today_requests
  FROM ai_usage_tracking
  WHERE request_timestamp >= date_trunc('day', now() AT TIME ZONE 'UTC');

  SELECT COUNT(*) INTO v_month_requests
  FROM ai_usage_tracking
  WHERE request_timestamp >= date_trunc('month', now() AT TIME ZONE 'UTC');

  SELECT COUNT(DISTINCT user_id) INTO v_active_users
  FROM ai_usage_tracking
  WHERE request_timestamp >= date_trunc('month', now() AT TIME ZONE 'UTC');

  SELECT COALESCE(jsonb_agg(row_to_json(t)), '[]'::jsonb) INTO v_provider_dist
  FROM (
    SELECT provider_used AS provider, COUNT(*) AS count
    FROM ai_usage_tracking
    WHERE request_timestamp >= date_trunc('month', now() AT TIME ZONE 'UTC')
    GROUP BY provider_used
  ) t;

  SELECT COALESCE(jsonb_agg(row_to_json(t)), '[]'::jsonb) INTO v_plan_dist
  FROM (
    SELECT
      COALESCE(get_user_plan(aut.user_id), 'FREE') AS plan,
      COUNT(*) AS count
    FROM ai_usage_tracking aut
    WHERE aut.request_timestamp >= date_trunc('month', now() AT TIME ZONE 'UTC')
    GROUP BY get_user_plan(aut.user_id)
  ) t;

  SELECT COUNT(*) INTO v_filtered
  FROM ai_usage_tracking
  WHERE response_status = 'filtered'
    AND request_timestamp >= date_trunc('month', now() AT TIME ZONE 'UTC');

  SELECT COUNT(*) INTO v_rate_limited
  FROM ai_usage_tracking
  WHERE response_status = 'rate_limited'
    AND request_timestamp >= date_trunc('month', now() AT TIME ZONE 'UTC');

  RETURN jsonb_build_object(
    'total_requests', v_total_requests,
    'today_requests', v_today_requests,
    'month_requests', v_month_requests,
    'active_users_this_month', v_active_users,
    'provider_distribution', v_provider_dist,
    'plan_distribution', v_plan_dist,
    'filtered_this_month', v_filtered,
    'rate_limited_this_month', v_rate_limited
  );
END;
$$;
