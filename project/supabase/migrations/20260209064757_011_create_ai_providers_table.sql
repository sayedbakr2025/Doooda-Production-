/*
  # Create AI providers table for AI token management
  
  1. New Tables
    - `ai_providers`
      - `id` (uuid, primary key)
      - `provider_name` (text) - 'openai', 'gemini', 'copilot', 'deepseek'
      - `api_key_encrypted` (text) - Encrypted API key
      - `api_endpoint` (text) - Optional custom endpoint
      - `model_name` (text) - Specific model (gpt-4, gemini-pro, etc)
      - `max_tokens` (integer) - Max tokens per request
      - `temperature` (decimal) - Model temperature setting
      - `is_enabled` (boolean) - Provider enabled/disabled
      - `is_default` (boolean) - Default provider for Ask Doooda
      - `daily_request_limit` (integer) - Rate limit per day
      - `last_test_at` (timestamp) - Last connection test
      - `last_test_result` (text) - Success or error
      - `created_at` (timestamp)
      - `updated_at` (timestamp)
  
  2. Security
    - API keys encrypted at rest
    - Keys NEVER sent to frontend
    - Test uses minimal safe request
    - Only success/failure logged (not responses)
  
  3. Purpose
    - Multiple AI provider support
    - Easy switching between providers
    - A/B testing different models
    - Fallback if primary fails
  
  4. Indexes
    - Index on is_enabled for active providers
    - Index on is_default for quick lookup
*/

CREATE TABLE IF NOT EXISTS ai_providers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_name text NOT NULL CHECK (provider_name IN ('openai', 'gemini', 'copilot', 'deepseek', 'anthropic')),
  api_key_encrypted text NOT NULL,
  api_endpoint text,
  model_name text NOT NULL,
  max_tokens integer DEFAULT 2000,
  temperature decimal(3,2) DEFAULT 0.7,
  is_enabled boolean DEFAULT false,
  is_default boolean DEFAULT false,
  daily_request_limit integer DEFAULT 10000,
  last_test_at timestamp with time zone,
  last_test_result text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

CREATE INDEX idx_ai_providers_enabled ON ai_providers(is_enabled);
CREATE INDEX idx_ai_providers_default ON ai_providers(is_default);
CREATE UNIQUE INDEX idx_ai_one_default ON ai_providers(is_default) WHERE is_default = true;

ALTER TABLE ai_providers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin can manage AI providers"
  ON ai_providers
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()::uuid
      AND users.role = 'admin'
    )
  );