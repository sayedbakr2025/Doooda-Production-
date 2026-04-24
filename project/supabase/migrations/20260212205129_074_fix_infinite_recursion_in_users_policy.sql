/*
  # Fix Infinite Recursion in Users Policy

  The users table policy was checking the users table itself to see if user is admin,
  causing infinite recursion. This migration fixes it by using auth.jwt() metadata instead.

  ## Changes
  - Drop problematic users_policy
  - Create new policy that uses auth.jwt() for admin check
  - Update all other policies to use auth.jwt() instead of querying users table
*/

-- ============================================================================
-- 1. FIX USERS TABLE POLICY - USE auth.jwt() INSTEAD OF QUERYING users TABLE
-- ============================================================================

DROP POLICY IF EXISTS "users_policy" ON users;
DROP POLICY IF EXISTS "Admins have full access" ON users;

-- Users can read and update their own data
CREATE POLICY "users_self_policy" ON users
  FOR ALL TO authenticated
  USING (id = (select auth.uid()))
  WITH CHECK (id = (select auth.uid()));

-- Admins can read all users (using jwt metadata)
CREATE POLICY "users_admin_read_policy" ON users
  FOR SELECT TO authenticated
  USING ((select auth.jwt()->>'role')::text = 'admin');

-- ============================================================================
-- 2. UPDATE OTHER POLICIES TO USE auth.jwt() FOR ADMIN CHECK
-- ============================================================================

-- User overrides
DROP POLICY IF EXISTS "user_overrides_policy" ON user_overrides;
CREATE POLICY "user_overrides_policy" ON user_overrides FOR ALL TO authenticated
  USING ((select auth.jwt()->>'role')::text = 'admin');

-- SMTP settings
DROP POLICY IF EXISTS "smtp_policy" ON smtp_settings;
CREATE POLICY "smtp_policy" ON smtp_settings FOR ALL TO authenticated
  USING ((select auth.jwt()->>'role')::text = 'admin');

-- AI providers
DROP POLICY IF EXISTS "ai_providers_policy" ON ai_providers;
CREATE POLICY "ai_providers_policy" ON ai_providers FOR ALL TO authenticated
  USING ((select auth.jwt()->>'role')::text = 'admin');

-- Publishers
DROP POLICY IF EXISTS "publishers_policy" ON publishers;
CREATE POLICY "publishers_policy" ON publishers FOR ALL TO authenticated
  USING (is_active = true OR (select auth.jwt()->>'role')::text = 'admin')
  WITH CHECK ((select auth.jwt()->>'role')::text = 'admin');

-- Tracking settings
DROP POLICY IF EXISTS "tracking_policy" ON tracking_settings;
CREATE POLICY "tracking_policy" ON tracking_settings FOR ALL TO authenticated
  USING ((select auth.jwt()->>'role')::text = 'admin');

-- Payment providers
DROP POLICY IF EXISTS "payment_providers_policy" ON payment_provider_settings;
CREATE POLICY "payment_providers_policy" ON payment_provider_settings FOR ALL TO authenticated
  USING ((select auth.jwt()->>'role')::text = 'admin');

-- Message templates
DROP POLICY IF EXISTS "message_templates_policy" ON message_templates;
CREATE POLICY "message_templates_policy" ON message_templates FOR ALL TO authenticated
  USING (is_enabled = true OR (select auth.jwt()->>'role')::text = 'admin')
  WITH CHECK ((select auth.jwt()->>'role')::text = 'admin');

-- AI usage limits
DROP POLICY IF EXISTS "ai_limits_policy" ON ai_usage_limits;
CREATE POLICY "ai_limits_policy" ON ai_usage_limits FOR ALL TO authenticated
  USING ((select auth.jwt()->>'role')::text = 'admin');

-- AI usage tracking
DROP POLICY IF EXISTS "ai_tracking_select_policy" ON ai_usage_tracking;
CREATE POLICY "ai_tracking_select_policy" ON ai_usage_tracking FOR SELECT TO authenticated
  USING (user_id = (select auth.uid()) OR (select auth.jwt()->>'role')::text = 'admin');

-- Projects
DROP POLICY IF EXISTS "projects_policy" ON projects;
CREATE POLICY "projects_policy" ON projects FOR ALL TO authenticated
  USING (user_id = (select auth.uid()) OR (select auth.jwt()->>'role')::text = 'admin')
  WITH CHECK (user_id = (select auth.uid()));

-- Tasks
DROP POLICY IF EXISTS "tasks_policy" ON tasks;
CREATE POLICY "tasks_policy" ON tasks FOR ALL TO authenticated
  USING (user_id = (select auth.uid()) OR (select auth.jwt()->>'role')::text = 'admin')
  WITH CHECK (user_id = (select auth.uid()));

-- Chapters
DROP POLICY IF EXISTS "chapters_policy" ON chapters;
CREATE POLICY "chapters_policy" ON chapters FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM projects p WHERE p.id = chapters.project_id AND (p.user_id = (select auth.uid()) OR (select auth.jwt()->>'role')::text = 'admin')))
  WITH CHECK (EXISTS (SELECT 1 FROM projects p WHERE p.id = chapters.project_id AND p.user_id = (select auth.uid())));

-- Characters
DROP POLICY IF EXISTS "characters_policy" ON characters;
CREATE POLICY "characters_policy" ON characters FOR ALL TO authenticated
  USING (user_id = (select auth.uid()) OR (select auth.jwt()->>'role')::text = 'admin')
  WITH CHECK (user_id = (select auth.uid()));

-- Scenes
DROP POLICY IF EXISTS "scenes_policy" ON scenes;
CREATE POLICY "scenes_policy" ON scenes FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM chapters c INNER JOIN projects p ON c.project_id = p.id WHERE c.id = scenes.chapter_id AND (p.user_id = (select auth.uid()) OR (select auth.jwt()->>'role')::text = 'admin')))
  WITH CHECK (EXISTS (SELECT 1 FROM chapters c INNER JOIN projects p ON c.project_id = p.id WHERE c.id = scenes.chapter_id AND p.user_id = (select auth.uid())));

-- Loglines
DROP POLICY IF EXISTS "loglines_policy" ON loglines;
CREATE POLICY "loglines_policy" ON loglines FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM projects p WHERE p.id = loglines.project_id AND (p.user_id = (select auth.uid()) OR (select auth.jwt()->>'role')::text = 'admin')))
  WITH CHECK (EXISTS (SELECT 1 FROM projects p WHERE p.id = loglines.project_id AND p.user_id = (select auth.uid())));

-- Daily writing sessions
DROP POLICY IF EXISTS "sessions_policy" ON daily_writing_sessions;
CREATE POLICY "sessions_policy" ON daily_writing_sessions FOR ALL TO authenticated
  USING (user_id = (select auth.uid()) OR (select auth.jwt()->>'role')::text = 'admin')
  WITH CHECK (user_id = (select auth.uid()));

-- Doooda config
DROP POLICY IF EXISTS "doooda_config_policy" ON doooda_config;
CREATE POLICY "doooda_config_policy" ON doooda_config FOR ALL TO authenticated
  USING ((select auth.jwt()->>'role')::text = 'admin');

-- Plans
DROP POLICY IF EXISTS "plans_manage_policy" ON plans;
CREATE POLICY "plans_manage_policy" ON plans FOR ALL TO authenticated
  USING ((select auth.jwt()->>'role')::text = 'admin');

-- Token packages
DROP POLICY IF EXISTS "packages_manage_policy" ON token_packages;
CREATE POLICY "packages_manage_policy" ON token_packages FOR ALL TO authenticated
  USING ((select auth.jwt()->>'role')::text = 'admin');

-- Plot templates
DROP POLICY IF EXISTS "templates_manage_policy" ON plot_templates;
CREATE POLICY "templates_manage_policy" ON plot_templates FOR ALL TO authenticated
  USING ((select auth.jwt()->>'role')::text = 'admin');

-- AI usage logs
DROP POLICY IF EXISTS "ai_logs_select_policy" ON ai_usage_logs;
CREATE POLICY "ai_logs_select_policy" ON ai_usage_logs FOR SELECT TO authenticated
  USING (user_id = (select auth.uid()) OR (select auth.jwt()->>'role')::text = 'admin');

-- Price versions
DROP POLICY IF EXISTS "price_versions_manage_policy" ON price_versions;
CREATE POLICY "price_versions_manage_policy" ON price_versions FOR ALL TO authenticated
  USING ((select auth.jwt()->>'role')::text = 'admin');