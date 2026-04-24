/*
  # Create Token System Tables

  1. New Columns to users table
    - `plan` (text, default 'free') - User's subscription plan
    - `tokens_balance` (integer, default 5000) - Available tokens for AI requests

  2. New Tables
    - `plans` - Defines available subscription plans
      - `plan` (text, primary key) - Plan name
      - `monthly_tokens` (integer) - Tokens allocated per month
      - `price` (numeric) - Monthly price
    
    - `token_usage` - Tracks token consumption
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key to auth.users)
      - `tokens_used` (integer) - Number of tokens consumed
      - `reason` (text) - What triggered token usage
      - `created_at` (timestamp)

  3. Security
    - Enable RLS on all new tables
    - Users can only read their own token_usage records
    - Plans table is publicly readable
    - Only authenticated users can access token system

  4. Initial Data
    - Seed plans table with free, pro, and max tiers
*/

-- Add columns to users table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'plan'
  ) THEN
    ALTER TABLE users ADD COLUMN plan text NOT NULL DEFAULT 'free';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'tokens_balance'
  ) THEN
    ALTER TABLE users ADD COLUMN tokens_balance integer NOT NULL DEFAULT 5000;
  END IF;
END $$;

-- Create plans table
CREATE TABLE IF NOT EXISTS plans (
  plan text PRIMARY KEY,
  monthly_tokens integer NOT NULL,
  price numeric NOT NULL
);

ALTER TABLE plans ENABLE ROW LEVEL SECURITY;

-- Plans are publicly readable
DROP POLICY IF EXISTS "Anyone can view plans" ON plans;
CREATE POLICY "Anyone can view plans"
  ON plans FOR SELECT
  TO authenticated
  USING (true);

-- Create token_usage table
CREATE TABLE IF NOT EXISTS token_usage (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tokens_used integer NOT NULL,
  reason text,
  created_at timestamp with time zone DEFAULT now()
);

ALTER TABLE token_usage ENABLE ROW LEVEL SECURITY;

-- Users can view their own token usage
DROP POLICY IF EXISTS "Users can view own token usage" ON token_usage;
CREATE POLICY "Users can view own token usage"
  ON token_usage FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Only backend can insert token usage (no direct user inserts)
DROP POLICY IF EXISTS "Service role can insert token usage" ON token_usage;
CREATE POLICY "Service role can insert token usage"
  ON token_usage FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Insert default plans
INSERT INTO plans (plan, monthly_tokens, price) VALUES
  ('free', 5000, 0),
  ('pro', 50000, 7),
  ('max', 200000, 15)
ON CONFLICT (plan) DO UPDATE SET
  monthly_tokens = EXCLUDED.monthly_tokens,
  price = EXCLUDED.price;

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_token_usage_user_id ON token_usage(user_id);
CREATE INDEX IF NOT EXISTS idx_token_usage_created_at ON token_usage(created_at);