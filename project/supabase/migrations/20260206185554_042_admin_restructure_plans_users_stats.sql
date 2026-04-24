/*
  # Admin Panel Restructure -- Plans, User Management, Dashboard Stats

  1. New Tables
    - `plans` -- Feature matrix for subscription plans
      - `id` (uuid, primary key)
      - `name` (text, unique) -- FREE, STANDARD, PRO
      - `display_name` (text) -- Human-readable name
      - `max_projects` (int, nullable = unlimited)
      - `max_chapters_per_project` (int, nullable = unlimited)
      - `max_words_per_project` (int, nullable = unlimited)
      - `doooda_access` (boolean) -- Whether plan has Ask Doooda
      - `doooda_daily_limit` (int, nullable = unlimited)
      - `doooda_monthly_limit` (int, nullable = unlimited)
      - `doooda_unlimited` (boolean)
      - `price_monthly` (numeric)
      - `price_yearly` (numeric)
      - `is_active` (boolean)
      - `sort_order` (int)
      - `created_at`, `updated_at` (timestamptz)

  2. Modified Tables
    - `users` -- Added plan management columns
      - `plan_name` (text, default FREE)
      - `plan_start_date` (timestamptz)
      - `plan_expires_at` (timestamptz)
      - `trial_enabled` (boolean, default false)
      - `is_active` (boolean, default true)

  3. New Functions
    - `get_admin_dashboard_stats()` -- Returns overview stats for admin dashboard

  4. Security
    - RLS enabled on `plans` table
    - Admin-only write policies
    - Authenticated users can read active plans

  5. Seed Data
    - FREE plan: 3 projects, no Doooda access
    - STANDARD plan: 10 projects, Doooda 10/day 200/month
    - PRO plan: unlimited everything
*/

-- 1. Create plans table
CREATE TABLE IF NOT EXISTS plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL,
  display_name text NOT NULL DEFAULT '',
  max_projects integer DEFAULT NULL,
  max_chapters_per_project integer DEFAULT NULL,
  max_words_per_project integer DEFAULT NULL,
  doooda_access boolean NOT NULL DEFAULT false,
  doooda_daily_limit integer DEFAULT NULL,
  doooda_monthly_limit integer DEFAULT NULL,
  doooda_unlimited boolean NOT NULL DEFAULT false,
  price_monthly numeric NOT NULL DEFAULT 0,
  price_yearly numeric NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage plans"
  ON plans FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "Authenticated users can read active plans"
  ON plans FOR SELECT
  TO authenticated
  USING (is_active = true);

-- Seed default plans
INSERT INTO plans (name, display_name, max_projects, max_chapters_per_project, max_words_per_project, doooda_access, doooda_daily_limit, doooda_monthly_limit, doooda_unlimited, price_monthly, price_yearly, is_active, sort_order)
VALUES
  ('FREE', 'Free', 3, 20, 50000, false, 0, 0, false, 0, 0, true, 1),
  ('STANDARD', 'Standard', 10, 50, 200000, true, 10, 200, false, 9.99, 99.99, true, 2),
  ('PRO', 'Pro', NULL, NULL, NULL, true, NULL, NULL, true, 19.99, 199.99, true, 3)
ON CONFLICT (name) DO NOTHING;

-- 2. Add plan management columns to users
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'plan_name'
  ) THEN
    ALTER TABLE users ADD COLUMN plan_name text NOT NULL DEFAULT 'FREE';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'plan_start_date'
  ) THEN
    ALTER TABLE users ADD COLUMN plan_start_date timestamptz DEFAULT now();
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'plan_expires_at'
  ) THEN
    ALTER TABLE users ADD COLUMN plan_expires_at timestamptz DEFAULT NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'trial_enabled'
  ) THEN
    ALTER TABLE users ADD COLUMN trial_enabled boolean NOT NULL DEFAULT false;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'is_active'
  ) THEN
    ALTER TABLE users ADD COLUMN is_active boolean NOT NULL DEFAULT true;
  END IF;
END $$;

-- 3. Create admin dashboard stats function
CREATE OR REPLACE FUNCTION get_admin_dashboard_stats()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  result jsonb;
  total_users_count integer;
  active_users_count integer;
  free_users_count integer;
  paid_users_count integer;
  admin_users_count integer;
  active_projects_count integer;
  total_doooda_requests integer;
  doooda_errors integer;
  doooda_today integer;
BEGIN
  SELECT count(*) INTO total_users_count
  FROM users WHERE role = 'writer' AND deleted_at IS NULL;

  SELECT count(*) INTO active_users_count
  FROM users WHERE role = 'writer' AND is_active = true AND deleted_at IS NULL;

  SELECT count(*) INTO free_users_count
  FROM users WHERE role = 'writer' AND plan_name = 'FREE' AND deleted_at IS NULL;

  SELECT count(*) INTO paid_users_count
  FROM users WHERE role = 'writer' AND plan_name != 'FREE' AND deleted_at IS NULL;

  SELECT count(*) INTO admin_users_count
  FROM users WHERE role = 'admin' AND deleted_at IS NULL;

  SELECT count(*) INTO active_projects_count
  FROM projects WHERE deleted_at IS NULL;

  SELECT count(*) INTO total_doooda_requests
  FROM ai_usage_tracking;

  SELECT count(*) INTO doooda_errors
  FROM ai_usage_tracking WHERE response_status = 'error';

  SELECT count(*) INTO doooda_today
  FROM ai_usage_tracking
  WHERE request_timestamp >= CURRENT_DATE;

  result := jsonb_build_object(
    'total_users', total_users_count,
    'active_users', active_users_count,
    'free_users', free_users_count,
    'paid_users', paid_users_count,
    'admin_users', admin_users_count,
    'active_projects', active_projects_count,
    'total_doooda_requests', total_doooda_requests,
    'doooda_errors', doooda_errors,
    'doooda_today', doooda_today
  );

  RETURN result;
END;
$$;
