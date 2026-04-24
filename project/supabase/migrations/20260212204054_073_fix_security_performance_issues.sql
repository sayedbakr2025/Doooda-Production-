/*
  # Fix All Security and Performance Issues

  This migration addresses all security and performance issues identified by Supabase:

  ## 1. Add Missing Foreign Key Indexes
    - ai_usage_limits.set_by_admin_id
    - subscriptions.price_version_id
    - subscriptions.user_id
    - user_overrides.granted_by_admin_id

  ## 2. Fix RLS Performance Issues
    - Replace auth.uid() with (select auth.uid()) in all policies

  ## 3. Remove Duplicate Policies
    - Consolidate multiple permissive policies into single policies

  ## 4. Add Missing RLS Policy
    - Add policy for price_versions table

  ## 5. Remove Duplicate and Unused Indexes
*/

-- ============================================================================
-- 1. ADD MISSING FOREIGN KEY INDEXES
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_ai_usage_limits_set_by_admin_id
  ON ai_usage_limits(set_by_admin_id);

CREATE INDEX IF NOT EXISTS idx_subscriptions_price_version_id
  ON subscriptions(price_version_id);

CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id
  ON subscriptions(user_id);

CREATE INDEX IF NOT EXISTS idx_user_overrides_granted_by_admin_id
  ON user_overrides(granted_by_admin_id);

-- ============================================================================
-- 2. FIX RLS PERFORMANCE ISSUES - DROP AND RECREATE POLICIES
-- ============================================================================

DO $$
DECLARE
    pol record;
BEGIN
    FOR pol IN 
        SELECT schemaname, tablename, policyname
        FROM pg_policies
        WHERE schemaname = 'public'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', 
                      pol.policyname, pol.schemaname, pol.tablename);
    END LOOP;
END$$;

-- ============================================================================
-- 3. CREATE NEW OPTIMIZED RLS POLICIES
-- ============================================================================

CREATE POLICY "users_policy" ON users FOR ALL TO authenticated
  USING (id = (select auth.uid()) OR EXISTS (SELECT 1 FROM users u WHERE u.id = (select auth.uid()) AND u.role = 'admin'))
  WITH CHECK (id = (select auth.uid()));

CREATE POLICY "user_overrides_policy" ON user_overrides FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM users u WHERE u.id = (select auth.uid()) AND u.role = 'admin'));

CREATE POLICY "smtp_policy" ON smtp_settings FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM users u WHERE u.id = (select auth.uid()) AND u.role = 'admin'));

CREATE POLICY "ai_providers_policy" ON ai_providers FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM users u WHERE u.id = (select auth.uid()) AND u.role = 'admin'));

CREATE POLICY "publishers_policy" ON publishers FOR ALL TO authenticated
  USING (is_active = true OR EXISTS (SELECT 1 FROM users u WHERE u.id = (select auth.uid()) AND u.role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM users u WHERE u.id = (select auth.uid()) AND u.role = 'admin'));

CREATE POLICY "tracking_policy" ON tracking_settings FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM users u WHERE u.id = (select auth.uid()) AND u.role = 'admin'));

CREATE POLICY "payment_providers_policy" ON payment_provider_settings FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM users u WHERE u.id = (select auth.uid()) AND u.role = 'admin'));

CREATE POLICY "message_templates_policy" ON message_templates FOR ALL TO authenticated
  USING (is_enabled = true OR EXISTS (SELECT 1 FROM users u WHERE u.id = (select auth.uid()) AND u.role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM users u WHERE u.id = (select auth.uid()) AND u.role = 'admin'));

CREATE POLICY "ai_limits_policy" ON ai_usage_limits FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM users u WHERE u.id = (select auth.uid()) AND u.role = 'admin'));

CREATE POLICY "ai_tracking_select_policy" ON ai_usage_tracking FOR SELECT TO authenticated
  USING (user_id = (select auth.uid()) OR EXISTS (SELECT 1 FROM users u WHERE u.id = (select auth.uid()) AND u.role = 'admin'));

CREATE POLICY "projects_policy" ON projects FOR ALL TO authenticated
  USING (user_id = (select auth.uid()) OR EXISTS (SELECT 1 FROM users u WHERE u.id = (select auth.uid()) AND u.role = 'admin'))
  WITH CHECK (user_id = (select auth.uid()));

CREATE POLICY "tasks_policy" ON tasks FOR ALL TO authenticated
  USING (user_id = (select auth.uid()) OR EXISTS (SELECT 1 FROM users u WHERE u.id = (select auth.uid()) AND u.role = 'admin'))
  WITH CHECK (user_id = (select auth.uid()));

CREATE POLICY "chapters_policy" ON chapters FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM projects p WHERE p.id = chapters.project_id AND (p.user_id = (select auth.uid()) OR EXISTS (SELECT 1 FROM users u WHERE u.id = (select auth.uid()) AND u.role = 'admin'))))
  WITH CHECK (EXISTS (SELECT 1 FROM projects p WHERE p.id = chapters.project_id AND p.user_id = (select auth.uid())));

CREATE POLICY "characters_policy" ON characters FOR ALL TO authenticated
  USING (user_id = (select auth.uid()) OR EXISTS (SELECT 1 FROM users u WHERE u.id = (select auth.uid()) AND u.role = 'admin'))
  WITH CHECK (user_id = (select auth.uid()));

CREATE POLICY "scenes_policy" ON scenes FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM chapters c INNER JOIN projects p ON c.project_id = p.id WHERE c.id = scenes.chapter_id AND (p.user_id = (select auth.uid()) OR EXISTS (SELECT 1 FROM users u WHERE u.id = (select auth.uid()) AND u.role = 'admin'))))
  WITH CHECK (EXISTS (SELECT 1 FROM chapters c INNER JOIN projects p ON c.project_id = p.id WHERE c.id = scenes.chapter_id AND p.user_id = (select auth.uid())));

CREATE POLICY "loglines_policy" ON loglines FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM projects p WHERE p.id = loglines.project_id AND (p.user_id = (select auth.uid()) OR EXISTS (SELECT 1 FROM users u WHERE u.id = (select auth.uid()) AND u.role = 'admin'))))
  WITH CHECK (EXISTS (SELECT 1 FROM projects p WHERE p.id = loglines.project_id AND p.user_id = (select auth.uid())));

CREATE POLICY "sessions_policy" ON daily_writing_sessions FOR ALL TO authenticated
  USING (user_id = (select auth.uid()) OR EXISTS (SELECT 1 FROM users u WHERE u.id = (select auth.uid()) AND u.role = 'admin'))
  WITH CHECK (user_id = (select auth.uid()));

CREATE POLICY "book_refs_policy" ON book_references FOR ALL TO authenticated
  USING (user_id = (select auth.uid()))
  WITH CHECK (user_id = (select auth.uid()));

CREATE POLICY "scene_refs_policy" ON scene_references FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM scenes s INNER JOIN chapters c ON s.chapter_id = c.id INNER JOIN projects p ON c.project_id = p.id WHERE s.id = scene_references.scene_id AND p.user_id = (select auth.uid())))
  WITH CHECK (EXISTS (SELECT 1 FROM scenes s INNER JOIN chapters c ON s.chapter_id = c.id INNER JOIN projects p ON c.project_id = p.id WHERE s.id = scene_references.scene_id AND p.user_id = (select auth.uid())));

CREATE POLICY "plot_projects_policy" ON plot_projects FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM projects p WHERE p.id = plot_projects.project_id AND p.user_id = (select auth.uid())))
  WITH CHECK (EXISTS (SELECT 1 FROM projects p WHERE p.id = plot_projects.project_id AND p.user_id = (select auth.uid())));

CREATE POLICY "plot_chapters_policy" ON plot_chapters FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM plot_projects pp INNER JOIN projects p ON pp.project_id = p.id WHERE pp.id = plot_chapters.plot_project_id AND p.user_id = (select auth.uid())))
  WITH CHECK (EXISTS (SELECT 1 FROM plot_projects pp INNER JOIN projects p ON pp.project_id = p.id WHERE pp.id = plot_chapters.plot_project_id AND p.user_id = (select auth.uid())));

CREATE POLICY "plot_scenes_policy" ON plot_scenes FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM plot_chapters pc INNER JOIN plot_projects pp ON pc.plot_project_id = pp.id INNER JOIN projects p ON pp.project_id = p.id WHERE pc.id = plot_scenes.chapter_id AND p.user_id = (select auth.uid())))
  WITH CHECK (EXISTS (SELECT 1 FROM plot_chapters pc INNER JOIN plot_projects pp ON pc.plot_project_id = pp.id INNER JOIN projects p ON pp.project_id = p.id WHERE pc.id = plot_scenes.chapter_id AND p.user_id = (select auth.uid())));

CREATE POLICY "plot_analysis_policy" ON plot_analysis FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM plot_projects pp INNER JOIN projects p ON pp.project_id = p.id WHERE pp.id = plot_analysis.plot_project_id AND p.user_id = (select auth.uid())))
  WITH CHECK (EXISTS (SELECT 1 FROM plot_projects pp INNER JOIN projects p ON pp.project_id = p.id WHERE pp.id = plot_analysis.plot_project_id AND p.user_id = (select auth.uid())));

CREATE POLICY "doooda_config_policy" ON doooda_config FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM users u WHERE u.id = (select auth.uid()) AND u.role = 'admin'));

CREATE POLICY "subscriptions_select_policy" ON subscriptions FOR SELECT TO authenticated
  USING (user_id = (select auth.uid()));

CREATE POLICY "token_usage_select_policy" ON token_usage FOR SELECT TO authenticated
  USING (user_id = (select auth.uid()));

CREATE POLICY "token_usage_insert_policy" ON token_usage FOR INSERT TO authenticated
  WITH CHECK ((select auth.jwt()->>'role')::text = 'service_role' OR user_id = (select auth.uid()));

CREATE POLICY "plans_select_policy" ON plans FOR SELECT TO authenticated USING (true);
CREATE POLICY "plans_manage_policy" ON plans FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM users u WHERE u.id = (select auth.uid()) AND u.role = 'admin'));

CREATE POLICY "packages_select_policy" ON token_packages FOR SELECT TO authenticated USING (true);
CREATE POLICY "packages_manage_policy" ON token_packages FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM users u WHERE u.id = (select auth.uid()) AND u.role = 'admin'));

CREATE POLICY "templates_select_policy" ON plot_templates FOR SELECT TO authenticated USING (is_active = true);
CREATE POLICY "templates_manage_policy" ON plot_templates FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM users u WHERE u.id = (select auth.uid()) AND u.role = 'admin'));

CREATE POLICY "ai_logs_select_policy" ON ai_usage_logs FOR SELECT TO authenticated
  USING (user_id = (select auth.uid()) OR EXISTS (SELECT 1 FROM users u WHERE u.id = (select auth.uid()) AND u.role = 'admin'));

CREATE POLICY "ai_logs_insert_policy" ON ai_usage_logs FOR INSERT TO authenticated
  WITH CHECK ((select auth.jwt()->>'role')::text = 'service_role' OR user_id = (select auth.uid()));

CREATE POLICY "price_versions_select_policy" ON price_versions FOR SELECT TO authenticated
  USING (active_until > now() OR active_until IS NULL);

CREATE POLICY "price_versions_manage_policy" ON price_versions FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM users u WHERE u.id = (select auth.uid()) AND u.role = 'admin'));

-- ============================================================================
-- 4. FIX FUNCTION SEARCH PATHS
-- ============================================================================

CREATE OR REPLACE FUNCTION is_admin()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin');
END;
$$;

-- ============================================================================
-- 5. REMOVE DUPLICATE AND UNUSED INDEXES
-- ============================================================================

DROP INDEX IF EXISTS idx_message_templates_key;
DROP INDEX IF EXISTS idx_users_email;
DROP INDEX IF EXISTS idx_user_overrides_type;
DROP INDEX IF EXISTS idx_user_overrides_active;
DROP INDEX IF EXISTS idx_user_overrides_expires;
DROP INDEX IF EXISTS idx_payment_provider_enabled;
DROP INDEX IF EXISTS idx_payment_provider_name;
DROP INDEX IF EXISTS idx_smtp_settings_active;
DROP INDEX IF EXISTS idx_ai_providers_default;
DROP INDEX IF EXISTS idx_publishers_sort;
DROP INDEX IF EXISTS idx_publishers_country_active;
DROP INDEX IF EXISTS idx_message_templates_type;
DROP INDEX IF EXISTS idx_message_templates_category;
DROP INDEX IF EXISTS idx_projects_updated_at;
DROP INDEX IF EXISTS idx_ai_tracking_timestamp;
DROP INDEX IF EXISTS idx_tracking_enabled;
DROP INDEX IF EXISTS idx_tracking_type;
DROP INDEX IF EXISTS idx_tracking_applies;
DROP INDEX IF EXISTS idx_ai_limits_type;
DROP INDEX IF EXISTS idx_ai_limits_active;
DROP INDEX IF EXISTS idx_ai_tracking_status;
DROP INDEX IF EXISTS idx_tasks_completed;
DROP INDEX IF EXISTS idx_sessions_project_date;
DROP INDEX IF EXISTS idx_plot_projects_last_analysis;
DROP INDEX IF EXISTS idx_ai_usage_logs_feature;
DROP INDEX IF EXISTS idx_ai_usage_logs_status;
DROP INDEX IF EXISTS idx_plot_templates_is_premium;