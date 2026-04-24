/*
  # Master Admin System Tables

  This migration creates all tables required for the Master Admin System upgrade.

  ## New Tables

  ### 1. admin_roles
  Multi-level admin role definitions (super_admin, content_admin, finance_admin, ai_admin, support_admin, analytics_admin)

  ### 2. admin_role_permissions
  Granular permission matrix per role per resource (view, edit, delete, create)

  ### 3. admin_users
  Admin accounts linked to auth.users with role assignment

  ### 4. platform_settings
  Feature flags, maintenance mode, and global platform toggles

  ### 5. branding_settings
  Logo, favicon, colors, footer text, legal links

  ### 6. tracking_scripts
  Google Analytics, GTM, Meta/TikTok/Snapchat Pixel, custom scripts

  ### 7. error_logs
  Edge function errors, AI failures, rate limits, payment failures

  ### 8. security_settings
  IP blocklist, 2FA enforcement, rate limit configuration

  ### 9. admin_sessions
  Track active admin sessions for security monitoring

  ### 10. login_attempts
  Track login attempts for security monitoring

  ## Security
  - RLS enabled on all tables
  - Only admins (is_admin() = true) can access admin tables
  - Error logs also writable by service role
*/

-- ============================================================
-- 1. admin_roles
-- ============================================================
CREATE TABLE IF NOT EXISTS admin_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL,
  display_name text NOT NULL,
  description text DEFAULT '',
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE admin_roles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view roles"
  ON admin_roles FOR SELECT
  TO authenticated
  USING (public.is_admin());

CREATE POLICY "Admins can insert roles"
  ON admin_roles FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin());

CREATE POLICY "Admins can update roles"
  ON admin_roles FOR UPDATE
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "Admins can delete roles"
  ON admin_roles FOR DELETE
  TO authenticated
  USING (public.is_admin());

-- Seed default roles
INSERT INTO admin_roles (name, display_name, description) VALUES
  ('super_admin', 'Super Admin', 'Full control over everything'),
  ('content_admin', 'Content Admin', 'Manage content, homepage, plot templates'),
  ('finance_admin', 'Finance Admin', 'Manage plans, tokens, payments'),
  ('ai_admin', 'AI Admin', 'Manage AI providers, Doooda settings'),
  ('support_admin', 'Support Admin', 'Manage users, send messages, handle issues'),
  ('analytics_admin', 'Analytics Admin', 'View analytics and reports')
ON CONFLICT (name) DO NOTHING;

-- ============================================================
-- 2. admin_role_permissions
-- ============================================================
CREATE TABLE IF NOT EXISTS admin_role_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  role_name text NOT NULL REFERENCES admin_roles(name) ON DELETE CASCADE,
  resource text NOT NULL,
  can_view boolean DEFAULT false,
  can_edit boolean DEFAULT false,
  can_delete boolean DEFAULT false,
  can_create boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  UNIQUE(role_name, resource)
);

ALTER TABLE admin_role_permissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view permissions"
  ON admin_role_permissions FOR SELECT
  TO authenticated
  USING (public.is_admin());

CREATE POLICY "Admins can insert permissions"
  ON admin_role_permissions FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin());

CREATE POLICY "Admins can update permissions"
  ON admin_role_permissions FOR UPDATE
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "Admins can delete permissions"
  ON admin_role_permissions FOR DELETE
  TO authenticated
  USING (public.is_admin());

-- Seed permissions for super_admin (full access)
INSERT INTO admin_role_permissions (role_name, resource, can_view, can_edit, can_delete, can_create)
SELECT 'super_admin', resource, true, true, true, true
FROM unnest(ARRAY[
  'users','plans','ai_providers','plot_templates','homepage',
  'project_types','messages','smtp','publishers','analytics',
  'errors','security','branding','tracking','platform_settings',
  'admin_roles','backup'
]) AS resource
ON CONFLICT (role_name, resource) DO NOTHING;

-- content_admin permissions
INSERT INTO admin_role_permissions (role_name, resource, can_view, can_edit, can_delete, can_create)
VALUES
  ('content_admin','homepage',true,true,false,true),
  ('content_admin','plot_templates',true,true,false,true),
  ('content_admin','project_types',true,true,false,false),
  ('content_admin','publishers',true,true,true,true),
  ('content_admin','messages',true,true,false,false)
ON CONFLICT (role_name, resource) DO NOTHING;

-- finance_admin permissions
INSERT INTO admin_role_permissions (role_name, resource, can_view, can_edit, can_delete, can_create)
VALUES
  ('finance_admin','plans',true,true,false,true),
  ('finance_admin','users',true,true,false,false),
  ('finance_admin','analytics',true,false,false,false)
ON CONFLICT (role_name, resource) DO NOTHING;

-- ai_admin permissions
INSERT INTO admin_role_permissions (role_name, resource, can_view, can_edit, can_delete, can_create)
VALUES
  ('ai_admin','ai_providers',true,true,true,true),
  ('ai_admin','project_types',true,true,false,false),
  ('ai_admin','analytics',true,false,false,false),
  ('ai_admin','errors',true,true,false,false)
ON CONFLICT (role_name, resource) DO NOTHING;

-- support_admin permissions
INSERT INTO admin_role_permissions (role_name, resource, can_view, can_edit, can_delete, can_create)
VALUES
  ('support_admin','users',true,true,false,false),
  ('support_admin','messages',true,true,false,true),
  ('support_admin','errors',true,true,false,false)
ON CONFLICT (role_name, resource) DO NOTHING;

-- analytics_admin permissions
INSERT INTO admin_role_permissions (role_name, resource, can_view, can_edit, can_delete, can_create)
VALUES
  ('analytics_admin','analytics',true,false,false,false),
  ('analytics_admin','users',true,false,false,false)
ON CONFLICT (role_name, resource) DO NOTHING;

-- ============================================================
-- 3. platform_settings
-- ============================================================
CREATE TABLE IF NOT EXISTS platform_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text UNIQUE NOT NULL,
  value jsonb NOT NULL DEFAULT 'true',
  description text DEFAULT '',
  category text DEFAULT 'general',
  updated_at timestamptz DEFAULT now(),
  updated_by uuid REFERENCES auth.users(id)
);

ALTER TABLE platform_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view platform settings"
  ON platform_settings FOR SELECT
  TO authenticated
  USING (public.is_admin());

CREATE POLICY "Admins can insert platform settings"
  ON platform_settings FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin());

CREATE POLICY "Admins can update platform settings"
  ON platform_settings FOR UPDATE
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "Admins can delete platform settings"
  ON platform_settings FOR DELETE
  TO authenticated
  USING (public.is_admin());

-- Seed default platform settings
INSERT INTO platform_settings (key, value, description, category) VALUES
  ('maintenance_mode', 'false', 'Enable maintenance mode for all users', 'general'),
  ('maintenance_message_ar', '"الموقع في وضع الصيانة، سنعود قريباً"', 'Maintenance mode message in Arabic', 'general'),
  ('maintenance_message_en', '"Site is under maintenance, we will be back soon"', 'Maintenance mode message in English', 'general'),
  ('feature_community', 'true', 'Enable community feature', 'features'),
  ('feature_academy', 'true', 'Enable academy feature', 'features'),
  ('feature_ai_ask', 'true', 'Enable Ask Doooda AI feature', 'ai'),
  ('feature_ai_critic', 'true', 'Enable AI Critic feature', 'ai'),
  ('feature_ai_tashkeel', 'true', 'Enable Arabic Tashkeel (diacritics) feature', 'ai'),
  ('feature_ai_punctuation', 'true', 'Enable AI Punctuation feature', 'ai'),
  ('feature_plot_templates', 'true', 'Enable plot templates feature', 'features'),
  ('feature_character_ai', 'true', 'Enable character-aware AI context', 'ai'),
  ('feature_marketing', 'true', 'Enable marketing section on homepage', 'features'),
  ('signup_enabled', 'true', 'Allow new user registrations', 'general'),
  ('max_free_projects', '3', 'Maximum projects for free users', 'limits')
ON CONFLICT (key) DO NOTHING;

-- ============================================================
-- 4. branding_settings
-- ============================================================
CREATE TABLE IF NOT EXISTS branding_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text UNIQUE NOT NULL,
  value text NOT NULL DEFAULT '',
  description text DEFAULT '',
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE branding_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view branding"
  ON branding_settings FOR SELECT
  TO authenticated
  USING (public.is_admin());

CREATE POLICY "Admins can insert branding"
  ON branding_settings FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin());

CREATE POLICY "Admins can update branding"
  ON branding_settings FOR UPDATE
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "Admins can delete branding"
  ON branding_settings FOR DELETE
  TO authenticated
  USING (public.is_admin());

-- Allow public read for branding (needed for frontend rendering)
CREATE POLICY "Public can read branding"
  ON branding_settings FOR SELECT
  TO anon
  USING (true);

INSERT INTO branding_settings (key, value, description) VALUES
  ('logo_url', '', 'URL of the platform logo'),
  ('favicon_url', '', 'URL of the platform favicon'),
  ('color_primary', '#3B82F6', 'Primary brand color (hex)'),
  ('color_accent', '#0EA5E9', 'Accent brand color (hex)'),
  ('footer_text_ar', 'جميع الحقوق محفوظة © دودا', 'Footer copyright text in Arabic'),
  ('footer_text_en', 'All rights reserved © Doooda', 'Footer copyright text in English'),
  ('legal_privacy_url', '/privacy', 'Privacy policy page URL'),
  ('legal_terms_url', '/terms', 'Terms of service page URL'),
  ('legal_cookies_url', '/cookies', 'Cookie policy page URL'),
  ('platform_name_ar', 'دودا', 'Platform name in Arabic'),
  ('platform_name_en', 'Doooda', 'Platform name in English'),
  ('support_email', 'support@doooda.com', 'Support email address')
ON CONFLICT (key) DO NOTHING;

-- ============================================================
-- 5. tracking_scripts
-- ============================================================
CREATE TABLE IF NOT EXISTS tracking_scripts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text UNIQUE NOT NULL,
  value text NOT NULL DEFAULT '',
  description text DEFAULT '',
  is_enabled boolean DEFAULT false,
  inject_location text DEFAULT 'head',
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE tracking_scripts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view tracking"
  ON tracking_scripts FOR SELECT
  TO authenticated
  USING (public.is_admin());

CREATE POLICY "Admins can insert tracking"
  ON tracking_scripts FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin());

CREATE POLICY "Admins can update tracking"
  ON tracking_scripts FOR UPDATE
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "Admins can delete tracking"
  ON tracking_scripts FOR DELETE
  TO authenticated
  USING (public.is_admin());

-- Public read for injecting scripts
CREATE POLICY "Public can read enabled tracking scripts"
  ON tracking_scripts FOR SELECT
  TO anon
  USING (is_enabled = true);

INSERT INTO tracking_scripts (key, value, description, is_enabled, inject_location) VALUES
  ('google_analytics_id', '', 'Google Analytics Measurement ID (e.g., G-XXXXXXXXXX)', false, 'head'),
  ('google_tag_manager_id', '', 'Google Tag Manager ID (e.g., GTM-XXXXXXX)', false, 'head'),
  ('meta_pixel_id', '', 'Meta (Facebook) Pixel ID', false, 'head'),
  ('tiktok_pixel_id', '', 'TikTok Pixel ID', false, 'head'),
  ('snapchat_pixel_id', '', 'Snapchat Pixel ID', false, 'head'),
  ('custom_head_script', '', 'Custom script injected in <head>', false, 'head'),
  ('custom_footer_script', '', 'Custom script injected before </body>', false, 'footer')
ON CONFLICT (key) DO NOTHING;

-- ============================================================
-- 6. error_logs
-- ============================================================
CREATE TABLE IF NOT EXISTS error_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source text NOT NULL DEFAULT 'unknown',
  severity text NOT NULL DEFAULT 'error',
  message text NOT NULL,
  details jsonb DEFAULT '{}',
  user_id uuid REFERENCES auth.users(id),
  resolved boolean DEFAULT false,
  resolved_by uuid REFERENCES auth.users(id),
  resolved_at timestamptz,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_error_logs_source ON error_logs(source);
CREATE INDEX IF NOT EXISTS idx_error_logs_severity ON error_logs(severity);
CREATE INDEX IF NOT EXISTS idx_error_logs_created_at ON error_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_error_logs_resolved ON error_logs(resolved);

ALTER TABLE error_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view error logs"
  ON error_logs FOR SELECT
  TO authenticated
  USING (public.is_admin());

CREATE POLICY "Admins can update error logs"
  ON error_logs FOR UPDATE
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "Service role can insert error logs"
  ON error_logs FOR INSERT
  TO service_role
  WITH CHECK (true);

-- ============================================================
-- 7. security_settings
-- ============================================================
CREATE TABLE IF NOT EXISTS security_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text UNIQUE NOT NULL,
  value jsonb NOT NULL DEFAULT 'null',
  description text DEFAULT '',
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE security_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view security settings"
  ON security_settings FOR SELECT
  TO authenticated
  USING (public.is_admin());

CREATE POLICY "Admins can insert security settings"
  ON security_settings FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin());

CREATE POLICY "Admins can update security settings"
  ON security_settings FOR UPDATE
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

INSERT INTO security_settings (key, value, description) VALUES
  ('require_2fa_for_admins', 'false', 'Enforce 2FA for all admin logins'),
  ('max_login_attempts', '10', 'Max failed login attempts before lockout'),
  ('login_lockout_minutes', '30', 'Lockout duration after failed attempts'),
  ('ip_blocklist', '[]', 'JSON array of blocked IP addresses'),
  ('suspicious_activity_threshold', '50', 'Requests per minute to flag as suspicious'),
  ('session_timeout_minutes', '480', 'Admin session timeout in minutes')
ON CONFLICT (key) DO NOTHING;

-- ============================================================
-- 8. login_attempts
-- ============================================================
CREATE TABLE IF NOT EXISTS login_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text,
  ip_address text,
  user_agent text,
  success boolean DEFAULT false,
  failure_reason text,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_login_attempts_email ON login_attempts(email);
CREATE INDEX IF NOT EXISTS idx_login_attempts_ip ON login_attempts(ip_address);
CREATE INDEX IF NOT EXISTS idx_login_attempts_created_at ON login_attempts(created_at DESC);

ALTER TABLE login_attempts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view login attempts"
  ON login_attempts FOR SELECT
  TO authenticated
  USING (public.is_admin());

CREATE POLICY "Service role can insert login attempts"
  ON login_attempts FOR INSERT
  TO service_role
  WITH CHECK (true);

-- ============================================================
-- 9. admin_activity_log (audit trail for all admin actions)
-- ============================================================
CREATE TABLE IF NOT EXISTS admin_activity_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id uuid REFERENCES auth.users(id),
  admin_email text,
  action text NOT NULL,
  resource_type text,
  resource_id text,
  old_values jsonb,
  new_values jsonb,
  ip_address text,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_admin_activity_admin_id ON admin_activity_log(admin_id);
CREATE INDEX IF NOT EXISTS idx_admin_activity_created_at ON admin_activity_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_admin_activity_resource ON admin_activity_log(resource_type, resource_id);

ALTER TABLE admin_activity_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view activity log"
  ON admin_activity_log FOR SELECT
  TO authenticated
  USING (public.is_admin());

CREATE POLICY "Admins can insert activity log"
  ON admin_activity_log FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin());

CREATE POLICY "Service role can insert activity log"
  ON admin_activity_log FOR INSERT
  TO service_role
  WITH CHECK (true);

-- ============================================================
-- Add admin_role column to users table if not exists
-- ============================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'admin_role'
  ) THEN
    ALTER TABLE users ADD COLUMN admin_role text REFERENCES admin_roles(name);
  END IF;
END $$;

-- Set super_admin role for existing admin users
UPDATE users
SET admin_role = 'super_admin'
WHERE role = 'admin' AND admin_role IS NULL;
