/*
  # Fix Remaining RLS Performance Issues
  
  1. Changes
    - Optimize all remaining auth function calls in RLS policies
    - Replace auth.uid() with (select auth.uid()) for better performance
    - Replace auth.jwt() with (select auth.jwt()) for better performance
  
  2. Security
    - Maintains same security level
    - Significantly improves query performance at scale
    
  3. Tables Updated
    - users (2 policies)
    - auth_sessions (2 policies)
    - audit_logs (1 policy)
    - user_overrides (1 policy)
    - smtp_settings (1 policy)
    - ai_providers (1 policy)
    - publishers (1 policy)
    - tracking_settings (1 policy)
    - payment_provider_settings (1 policy)
    - message_templates (1 policy)
    - ai_usage_limits (1 policy)
*/

-- Users table policies
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'users' AND policyname = 'Users can read own data'
  ) THEN
    DROP POLICY "Users can read own data" ON users;
  END IF;
END $$;

CREATE POLICY "Users can read own data"
  ON users FOR SELECT
  TO authenticated
  USING (id = (select auth.uid()));

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'users' AND policyname = 'Admin can read all users'
  ) THEN
    DROP POLICY "Admin can read all users" ON users;
  END IF;
END $$;

CREATE POLICY "Admin can read all users"
  ON users FOR SELECT
  TO authenticated
  USING ((select auth.jwt()->>'role') = 'admin');

-- Auth sessions policies
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'auth_sessions' AND policyname = 'Users can read own sessions'
  ) THEN
    DROP POLICY "Users can read own sessions" ON auth_sessions;
  END IF;
END $$;

CREATE POLICY "Users can read own sessions"
  ON auth_sessions FOR SELECT
  TO authenticated
  USING (user_id = (select auth.uid()));

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'auth_sessions' AND policyname = 'Users can delete own sessions'
  ) THEN
    DROP POLICY "Users can delete own sessions" ON auth_sessions;
  END IF;
END $$;

CREATE POLICY "Users can delete own sessions"
  ON auth_sessions FOR DELETE
  TO authenticated
  USING (user_id = (select auth.uid()));

-- Audit logs policy
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'audit_logs' AND policyname = 'Admin can read all audit logs'
  ) THEN
    DROP POLICY "Admin can read all audit logs" ON audit_logs;
  END IF;
END $$;

CREATE POLICY "Admin can read all audit logs"
  ON audit_logs FOR SELECT
  TO authenticated
  USING ((select auth.jwt()->>'role') = 'admin');

-- User overrides policy
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'user_overrides' AND policyname = 'Admin can manage all overrides'
  ) THEN
    DROP POLICY "Admin can manage all overrides" ON user_overrides;
  END IF;
END $$;

CREATE POLICY "Admin can manage all overrides"
  ON user_overrides FOR ALL
  TO authenticated
  USING ((select auth.jwt()->>'role') = 'admin')
  WITH CHECK ((select auth.jwt()->>'role') = 'admin');

-- SMTP settings policy
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'smtp_settings' AND policyname = 'Admin can manage SMTP settings'
  ) THEN
    DROP POLICY "Admin can manage SMTP settings" ON smtp_settings;
  END IF;
END $$;

CREATE POLICY "Admin can manage SMTP settings"
  ON smtp_settings FOR ALL
  TO authenticated
  USING ((select auth.jwt()->>'role') = 'admin')
  WITH CHECK ((select auth.jwt()->>'role') = 'admin');

-- AI providers policy
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'ai_providers' AND policyname = 'Admin can manage AI providers'
  ) THEN
    DROP POLICY "Admin can manage AI providers" ON ai_providers;
  END IF;
END $$;

CREATE POLICY "Admin can manage AI providers"
  ON ai_providers FOR ALL
  TO authenticated
  USING ((select auth.jwt()->>'role') = 'admin')
  WITH CHECK ((select auth.jwt()->>'role') = 'admin');

-- Publishers policy
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'publishers' AND policyname = 'Admin can manage publishers'
  ) THEN
    DROP POLICY "Admin can manage publishers" ON publishers;
  END IF;
END $$;

CREATE POLICY "Admin can manage publishers"
  ON publishers FOR ALL
  TO authenticated
  USING ((select auth.jwt()->>'role') = 'admin')
  WITH CHECK ((select auth.jwt()->>'role') = 'admin');

-- Tracking settings policy
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'tracking_settings' AND policyname = 'Admin can manage tracking settings'
  ) THEN
    DROP POLICY "Admin can manage tracking settings" ON tracking_settings;
  END IF;
END $$;

CREATE POLICY "Admin can manage tracking settings"
  ON tracking_settings FOR ALL
  TO authenticated
  USING ((select auth.jwt()->>'role') = 'admin')
  WITH CHECK ((select auth.jwt()->>'role') = 'admin');

-- Payment provider settings policy
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'payment_provider_settings' AND policyname = 'Admin can manage payment providers'
  ) THEN
    DROP POLICY "Admin can manage payment providers" ON payment_provider_settings;
  END IF;
END $$;

CREATE POLICY "Admin can manage payment providers"
  ON payment_provider_settings FOR ALL
  TO authenticated
  USING ((select auth.jwt()->>'role') = 'admin')
  WITH CHECK ((select auth.jwt()->>'role') = 'admin');

-- Message templates policy
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'message_templates' AND policyname = 'Admin can manage message templates'
  ) THEN
    DROP POLICY "Admin can manage message templates" ON message_templates;
  END IF;
END $$;

CREATE POLICY "Admin can manage message templates"
  ON message_templates FOR ALL
  TO authenticated
  USING ((select auth.jwt()->>'role') = 'admin')
  WITH CHECK ((select auth.jwt()->>'role') = 'admin');

-- AI usage limits policy
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'ai_usage_limits' AND policyname = 'Admin can manage AI limits'
  ) THEN
    DROP POLICY "Admin can manage AI limits" ON ai_usage_limits;
  END IF;
END $$;

CREATE POLICY "Admin can manage AI limits"
  ON ai_usage_limits FOR ALL
  TO authenticated
  USING ((select auth.jwt()->>'role') = 'admin')
  WITH CHECK ((select auth.jwt()->>'role') = 'admin');