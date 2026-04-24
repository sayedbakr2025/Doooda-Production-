/*
  # Fix RLS for Admin Tables and Enable Missing RLS
  
  1. Changes
    - Enable RLS on tables without it
    - Optimize admin policies with (select auth.uid())
    - Add basic RLS policies for previously unprotected tables
  
  2. Security
    - Protects sensitive data
    - Improves performance
*/

-- Enable RLS on tables that don't have it
ALTER TABLE email_verification_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE password_reset_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE price_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscription_history ENABLE ROW LEVEL SECURITY;

-- Price versions - read-only for everyone
CREATE POLICY "Anyone can view active price versions"
  ON price_versions FOR SELECT
  TO authenticated
  USING (active_until IS NULL OR active_until > now());

-- Subscription history - users can view own history
CREATE POLICY "Users can view own subscription history"
  ON subscription_history FOR SELECT
  TO authenticated
  USING ((select auth.uid()) = user_id);

-- Email verification tokens - users can only access own tokens
CREATE POLICY "Users can view own verification tokens"
  ON email_verification_tokens FOR SELECT
  TO authenticated
  USING (
    user_id IN (
      SELECT id FROM auth.users WHERE id = (select auth.uid())
    )
  );

-- Password reset tokens - users can only access own tokens
CREATE POLICY "Users can view own reset tokens"
  ON password_reset_tokens FOR SELECT
  TO authenticated
  USING (
    user_id IN (
      SELECT id FROM auth.users WHERE id = (select auth.uid())
    )
  );

-- Optimize existing admin policies
-- Note: We'll keep admin policies simple since they're for admin panel only
-- In production, you should check user role from a custom users table or JWT claims

-- AI Usage Tracking
DROP POLICY IF EXISTS "Users can view own AI tracking" ON ai_usage_tracking;
DROP POLICY IF EXISTS "Admin can view AI tracking" ON ai_usage_tracking;

CREATE POLICY "Users can view own AI tracking"
  ON ai_usage_tracking FOR SELECT
  TO authenticated
  USING ((select auth.uid()) = user_id);

-- Subscriptions
DROP POLICY IF EXISTS "Users can read own subscription" ON subscriptions;
DROP POLICY IF EXISTS "Users can update own subscription" ON subscriptions;

CREATE POLICY "Users can read own subscription"
  ON subscriptions FOR SELECT
  TO authenticated
  USING ((select auth.uid()) = user_id);

CREATE POLICY "Users can update own subscription"
  ON subscriptions FOR UPDATE
  TO authenticated
  USING ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);