/*
  # Plans & Token Packages System with Multiplier

  1. Changes to Tables
    - Drop existing `plans` table and recreate with multiplier
    - Create new `token_packages` table for purchasable token bundles
    
  2. Plans Table Structure
    - `name` (text, primary key) - Plan identifier (free, pro, max)
    - `monthly_tokens` (int) - Base tokens allocation (non-renewable for free)
    - `multiplier` (float) - Cost multiplier for AI token usage
    - `price` (float) - Monthly subscription price
    
  3. Token Packages Table Structure
    - `id` (serial, primary key)
    - `tokens` (int) - Number of tokens in package
    - `price` (float) - Package price in USD
    
  4. Seed Data
    - 3 Plans: free (1000 tokens, 3x multiplier), pro (20000 tokens, 3x), max (100000 tokens, 2.5x)
    - 2 Token packages: 5000 for $3, 20000 for $10
    
  5. Security
    - Enable RLS on both tables
    - Public read access for plans and packages
    - Only admins can modify
*/

-- Drop existing plans table if exists and recreate
DROP TABLE IF EXISTS plans CASCADE;

CREATE TABLE plans (
  name text PRIMARY KEY,
  monthly_tokens integer NOT NULL CHECK (monthly_tokens > 0),
  multiplier numeric(4,2) NOT NULL CHECK (multiplier > 0),
  price numeric(10,2) NOT NULL CHECK (price >= 0),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Insert default plans
INSERT INTO plans (name, monthly_tokens, multiplier, price) VALUES
  ('free', 1000, 3.0, 0),
  ('pro', 20000, 3.0, 5),
  ('max', 100000, 2.5, 10);

-- Create token packages table
CREATE TABLE IF NOT EXISTS token_packages (
  id serial PRIMARY KEY,
  tokens integer NOT NULL CHECK (tokens > 0),
  price numeric(10,2) NOT NULL CHECK (price > 0),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Insert default token packages
INSERT INTO token_packages (tokens, price) VALUES
  (5000, 3),
  (20000, 10);

-- Enable RLS
ALTER TABLE plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE token_packages ENABLE ROW LEVEL SECURITY;

-- Public read access for plans
CREATE POLICY "Anyone can view plans"
  ON plans FOR SELECT
  USING (true);

-- Public read access for token packages
CREATE POLICY "Anyone can view token packages"
  ON token_packages FOR SELECT
  USING (true);

-- Only admins can modify plans
CREATE POLICY "Only admins can modify plans"
  ON plans FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

-- Only admins can modify token packages
CREATE POLICY "Only admins can modify token packages"
  ON token_packages FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );
