/*
  # Create AI usage limits table for Ask Doooda control
  
  1. New Tables
    - `ai_usage_limits` - Controls daily/monthly limits per plan or user
    - `ai_usage_tracking` - Tracks all AI requests for analytics and rate limiting
  
  2. Security
    - All limits enforced server-side only
    - Never exposed to frontend clients
    - All changes logged in audit_logs
*/

CREATE TABLE IF NOT EXISTS ai_usage_limits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  limit_type text NOT NULL CHECK (limit_type IN ('global_default', 'plan_based', 'user_override')),
  plan_name text CHECK (plan_name IN ('FREE', 'STANDARD', 'PRO') OR plan_name IS NULL),
  user_id uuid REFERENCES users(id) ON DELETE CASCADE,
  daily_limit integer,
  monthly_limit integer,
  is_unlimited boolean DEFAULT false,
  is_active boolean DEFAULT true,
  reason text,
  set_by_admin_id uuid REFERENCES users(id) ON DELETE SET NULL,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  
  CONSTRAINT check_limit_type_consistency CHECK (
    (limit_type = 'global_default' AND plan_name IS NULL AND user_id IS NULL) OR
    (limit_type = 'plan_based' AND plan_name IS NOT NULL AND user_id IS NULL) OR
    (limit_type = 'user_override' AND user_id IS NOT NULL)
  )
);

CREATE TABLE IF NOT EXISTS ai_usage_tracking (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  request_type text NOT NULL CHECK (request_type IN ('question', 'generation', 'analysis', 'other')),
  provider_used text NOT NULL,
  tokens_used integer DEFAULT 0,
  request_timestamp timestamp with time zone DEFAULT now(),
  response_status text NOT NULL CHECK (response_status IN ('success', 'error', 'rate_limited', 'no_access')),
  error_message text
);

CREATE INDEX idx_ai_limits_user_id ON ai_usage_limits(user_id);
CREATE INDEX idx_ai_limits_type ON ai_usage_limits(limit_type);
CREATE INDEX idx_ai_limits_active ON ai_usage_limits(is_active);
CREATE INDEX idx_ai_limits_plan ON ai_usage_limits(plan_name);
CREATE UNIQUE INDEX idx_ai_limits_one_per_user ON ai_usage_limits(user_id) WHERE limit_type = 'user_override' AND is_active = true;

CREATE INDEX idx_ai_tracking_user_id ON ai_usage_tracking(user_id);
CREATE INDEX idx_ai_tracking_timestamp ON ai_usage_tracking(request_timestamp);
CREATE INDEX idx_ai_tracking_user_date ON ai_usage_tracking(user_id, request_timestamp);
CREATE INDEX idx_ai_tracking_status ON ai_usage_tracking(response_status);

ALTER TABLE ai_usage_limits ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_usage_tracking ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin can manage AI limits"
  ON ai_usage_limits
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()::uuid
      AND users.role = 'admin'
    )
  );

CREATE POLICY "Admin can view AI tracking"
  ON ai_usage_tracking
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()::uuid
      AND users.role = 'admin'
    )
  );

CREATE POLICY "Users can view own AI tracking"
  ON ai_usage_tracking
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid()::uuid);