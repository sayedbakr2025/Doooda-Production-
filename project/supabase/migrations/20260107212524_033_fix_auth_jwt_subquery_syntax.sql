/*
  # Fix Auth JWT Subquery Syntax
  
  1. Changes
    - Correct the SELECT subquery syntax for auth.jwt() calls
    - The SELECT should wrap ONLY auth.jwt(), not the entire expression
    - Pattern: (SELECT auth.jwt())->>'role' instead of (SELECT auth.jwt()->>'role')
  
  2. Security
    - Maintains same security level
    - Properly optimizes query performance at scale
    
  3. Tables Updated
    - users (Admin can read all users policy)
    - audit_logs (Admin can read all audit logs policy)
    - user_overrides (Admin can manage all overrides policy)
    - smtp_settings (Admin can manage SMTP settings policy)
    - ai_providers (Admin can manage AI providers policy)
    - publishers (Admin can manage publishers policy)
    - tracking_settings (Admin can manage tracking settings policy)
    - payment_provider_settings (Admin can manage payment providers policy)
    - message_templates (Admin can manage message templates policy)
    - ai_usage_limits (Admin can manage AI limits policy)
*/

-- Users table - Admin policy
DROP POLICY IF EXISTS "Admin can read all users" ON users;
CREATE POLICY "Admin can read all users"
  ON users FOR SELECT
  TO authenticated
  USING ((SELECT auth.jwt())->>'role' = 'admin');

-- Audit logs policy
DROP POLICY IF EXISTS "Admin can read all audit logs" ON audit_logs;
CREATE POLICY "Admin can read all audit logs"
  ON audit_logs FOR SELECT
  TO authenticated
  USING ((SELECT auth.jwt())->>'role' = 'admin');

-- User overrides policy
DROP POLICY IF EXISTS "Admin can manage all overrides" ON user_overrides;
CREATE POLICY "Admin can manage all overrides"
  ON user_overrides FOR ALL
  TO authenticated
  USING ((SELECT auth.jwt())->>'role' = 'admin')
  WITH CHECK ((SELECT auth.jwt())->>'role' = 'admin');

-- SMTP settings policy
DROP POLICY IF EXISTS "Admin can manage SMTP settings" ON smtp_settings;
CREATE POLICY "Admin can manage SMTP settings"
  ON smtp_settings FOR ALL
  TO authenticated
  USING ((SELECT auth.jwt())->>'role' = 'admin')
  WITH CHECK ((SELECT auth.jwt())->>'role' = 'admin');

-- AI providers policy
DROP POLICY IF EXISTS "Admin can manage AI providers" ON ai_providers;
CREATE POLICY "Admin can manage AI providers"
  ON ai_providers FOR ALL
  TO authenticated
  USING ((SELECT auth.jwt())->>'role' = 'admin')
  WITH CHECK ((SELECT auth.jwt())->>'role' = 'admin');

-- Publishers policy
DROP POLICY IF EXISTS "Admin can manage publishers" ON publishers;
CREATE POLICY "Admin can manage publishers"
  ON publishers FOR ALL
  TO authenticated
  USING ((SELECT auth.jwt())->>'role' = 'admin')
  WITH CHECK ((SELECT auth.jwt())->>'role' = 'admin');

-- Tracking settings policy
DROP POLICY IF EXISTS "Admin can manage tracking settings" ON tracking_settings;
CREATE POLICY "Admin can manage tracking settings"
  ON tracking_settings FOR ALL
  TO authenticated
  USING ((SELECT auth.jwt())->>'role' = 'admin')
  WITH CHECK ((SELECT auth.jwt())->>'role' = 'admin');

-- Payment provider settings policy
DROP POLICY IF EXISTS "Admin can manage payment providers" ON payment_provider_settings;
CREATE POLICY "Admin can manage payment providers"
  ON payment_provider_settings FOR ALL
  TO authenticated
  USING ((SELECT auth.jwt())->>'role' = 'admin')
  WITH CHECK ((SELECT auth.jwt())->>'role' = 'admin');

-- Message templates policy
DROP POLICY IF EXISTS "Admin can manage message templates" ON message_templates;
CREATE POLICY "Admin can manage message templates"
  ON message_templates FOR ALL
  TO authenticated
  USING ((SELECT auth.jwt())->>'role' = 'admin')
  WITH CHECK ((SELECT auth.jwt())->>'role' = 'admin');

-- AI usage limits policy
DROP POLICY IF EXISTS "Admin can manage AI limits" ON ai_usage_limits;
CREATE POLICY "Admin can manage AI limits"
  ON ai_usage_limits FOR ALL
  TO authenticated
  USING ((SELECT auth.jwt())->>'role' = 'admin')
  WITH CHECK ((SELECT auth.jwt())->>'role' = 'admin');