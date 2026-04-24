/*
  # Create AI Usage Logs Table

  1. New Table
    - `ai_usage_logs` - Tracks all AI usage with detailed metrics
    - Stores user_id, feature, provider, tokens, cost, timestamps
    - Includes request and response metadata
    - Multiplier applied and final cost calculated

  2. Features
    - Complete audit trail of all AI usage
    - Support for different features (ask_doooda, analyze_plot, etc.)
    - Track input/output tokens separately
    - Store multiplier and final cost
    - Include success/failure status

  3. Security
    - Enable RLS
    - Users can only read their own logs
    - Only system can insert (via Edge Functions with service role)
    - No user updates or deletes
    - Admin can read all logs

  4. Indexes
    - user_id for fast user queries
    - created_at for time-based queries
    - feature for feature-based analytics
*/

CREATE TABLE IF NOT EXISTS ai_usage_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  feature text NOT NULL CHECK (feature IN (
    'ask_doooda',
    'analyze_plot',
    'generate_content',
    'other'
  )),
  provider text NOT NULL,
  model text,
  prompt_tokens integer NOT NULL DEFAULT 0 CHECK (prompt_tokens >= 0),
  completion_tokens integer NOT NULL DEFAULT 0 CHECK (completion_tokens >= 0),
  total_tokens integer NOT NULL DEFAULT 0 CHECK (total_tokens >= 0),
  multiplier numeric NOT NULL DEFAULT 2.0 CHECK (multiplier > 0),
  final_cost integer NOT NULL DEFAULT 0 CHECK (final_cost >= 0),
  status text NOT NULL DEFAULT 'success' CHECK (status IN (
    'success',
    'error',
    'rate_limited',
    'insufficient_tokens'
  )),
  error_message text,
  request_metadata jsonb DEFAULT '{}',
  response_metadata jsonb DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE ai_usage_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own usage logs"
  ON ai_usage_logs
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all usage logs"
  ON ai_usage_logs
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

CREATE INDEX IF NOT EXISTS idx_ai_usage_logs_user_id 
  ON ai_usage_logs(user_id);

CREATE INDEX IF NOT EXISTS idx_ai_usage_logs_created_at 
  ON ai_usage_logs(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_ai_usage_logs_feature 
  ON ai_usage_logs(feature);

CREATE INDEX IF NOT EXISTS idx_ai_usage_logs_status 
  ON ai_usage_logs(status);
