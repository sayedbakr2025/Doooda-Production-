-- Clean migration: add plan_code to users, create/RFC get_user_plan function
-- This handles the partial state from previous migrations

-- Ensure plans columns exist (idempotent)
ALTER TABLE plans ADD COLUMN IF NOT EXISTS code text UNIQUE;
ALTER TABLE plans ADD COLUMN IF NOT EXISTS name_ar text DEFAULT '';
ALTER TABLE plans ADD COLUMN IF NOT EXISTS name_en text DEFAULT '';
ALTER TABLE plans ADD COLUMN IF NOT EXISTS tokens_initial integer DEFAULT 0;
ALTER TABLE plans ADD COLUMN IF NOT EXISTS tokens_recurring integer DEFAULT 0;
ALTER TABLE plans ADD COLUMN IF NOT EXISTS allow_token_purchase boolean DEFAULT false;
ALTER TABLE plans ADD COLUMN IF NOT EXISTS features jsonb DEFAULT '{}';
ALTER TABLE plans ADD COLUMN IF NOT EXISTS price_monthly numeric DEFAULT 0;

-- Re-backfill: only update rows where backfill hasn't happened yet
UPDATE plans SET
  code = CASE WHEN code IS NULL OR code = '' THEN
    CASE
      WHEN LOWER(name) = 'free' THEN 'free'
      WHEN LOWER(name) = 'pro' THEN 'pro'
      WHEN LOWER(name) = 'max' THEN 'max'
      ELSE LOWER(REPLACE(name, ' ', '_'))
    END ELSE code END,
  name_ar = CASE WHEN name_ar = '' OR name_ar IS NULL THEN
    CASE
      WHEN LOWER(name) = 'free' THEN 'كاتب هاوي'
      WHEN LOWER(name) = 'pro' THEN 'كاتب جاد'
      WHEN LOWER(name) = 'max' THEN 'كاتب محترف'
      ELSE name
    END ELSE name_ar END,
  name_en = CASE WHEN name_en = '' OR name_en IS NULL THEN
    CASE
      WHEN LOWER(name) = 'free' THEN 'Hobbyist Writer'
      WHEN LOWER(name) = 'pro' THEN 'Serious Writer'
      WHEN LOWER(name) = 'max' THEN 'Professional Writer'
      ELSE name
    END ELSE name_en END,
  tokens_initial = CASE WHEN tokens_initial = 0 THEN
    CASE
      WHEN LOWER(name) = 'free' THEN 10000
      WHEN LOWER(name) = 'pro' THEN 120000
      WHEN LOWER(name) = 'max' THEN 300000
      ELSE 0
    END ELSE tokens_initial END,
  tokens_recurring = CASE WHEN tokens_recurring = 0 THEN
    CASE
      WHEN LOWER(name) = 'pro' THEN 120000
      WHEN LOWER(name) = 'max' THEN 300000
      ELSE 0
    END ELSE tokens_recurring END,
  allow_token_purchase = CASE WHEN allow_token_purchase = false THEN
    CASE WHEN LOWER(name) != 'free' THEN true ELSE false END
    ELSE allow_token_purchase END,
  features = CASE WHEN features = '{}'::jsonb OR features IS NULL THEN
    CASE
      WHEN LOWER(name) = 'free' THEN
        '{"academy": true, "competitions": true, "max_projects": 3, "export_pdf": false, "export_word": false, "marketing": false, "doooda_daily_limit": 5, "doooda_monthly_limit": 50, "doooda_max_tokens": 1000, "doooda_context_budget": 800}'::jsonb
      WHEN LOWER(name) = 'pro' THEN
        '{"academy": true, "competitions": true, "max_projects": 15, "export_pdf": true, "export_word": true, "marketing": true, "doooda_daily_limit": 30, "doooda_monthly_limit": 500, "doooda_max_tokens": 2000, "doooda_context_budget": 2000}'::jsonb
      WHEN LOWER(name) = 'max' THEN
        '{"academy": true, "competitions": true, "max_projects": 50, "export_pdf": true, "export_word": true, "marketing": true, "doooda_daily_limit": null, "doooda_monthly_limit": null, "doooda_max_tokens": 2000, "doooda_context_budget": 2000}'::jsonb
      ELSE '{}'::jsonb
    END ELSE features END
WHERE code IS NULL OR code = '' OR name_ar = '' OR name_en = '' OR features = '{}'::jsonb OR features IS NULL;

-- Add plan_code column to users (text, references plans.name)
ALTER TABLE users ADD COLUMN IF NOT EXISTS plan_code text;
ALTER TABLE users ADD COLUMN IF NOT EXISTS plan_id uuid;

-- Backfill plan_code from existing plan column
UPDATE users SET plan_code = LOWER(plan) WHERE plan_code IS NULL;

-- Drop and recreate get_user_plan function
DROP FUNCTION IF EXISTS get_user_plan(uuid);

CREATE OR REPLACE FUNCTION get_user_plan(p_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_code text;
  v_name text;
  v_name_ar text;
  v_name_en text;
  v_tokens_initial integer;
  v_tokens_recurring integer;
  v_allow_token_purchase boolean;
  v_monthly_tokens integer;
  v_multiplier numeric;
  v_price numeric;
  v_price_monthly numeric;
  v_features jsonb;
BEGIN
  SELECT p.code, p.name, p.name_ar, p.name_en,
         p.tokens_initial, p.tokens_recurring, p.allow_token_purchase,
         p.monthly_tokens, p.multiplier, p.price, p.price_monthly, p.features
  INTO v_code, v_name, v_name_ar, v_name_en,
       v_tokens_initial, v_tokens_recurring, v_allow_token_purchase,
       v_monthly_tokens, v_multiplier, v_price, v_price_monthly, v_features
  FROM plans p
  JOIN users u ON LOWER(u.plan) = LOWER(p.name) OR LOWER(u.plan) = LOWER(p.code) OR u.plan_code = p.code
  WHERE u.id = p_user_id
  LIMIT 1;

  IF v_code IS NULL THEN
    SELECT p.code, p.name, p.name_ar, p.name_en,
           p.tokens_initial, p.tokens_recurring, p.allow_token_purchase,
           p.monthly_tokens, p.multiplier, p.price, p.price_monthly, p.features
    INTO v_code, v_name, v_name_ar, v_name_en,
         v_tokens_initial, v_tokens_recurring, v_allow_token_purchase,
         v_monthly_tokens, v_multiplier, v_price, v_price_monthly, v_features
    FROM plans p
    WHERE LOWER(p.name) = 'free' OR LOWER(p.code) = 'free'
    LIMIT 1;
  END IF;

  IF v_code IS NULL THEN
    RETURN jsonb_build_object(
      'code', 'free',
      'name', 'free',
      'name_ar', 'كاتب هاوي',
      'name_en', 'Hobbyist Writer',
      'error', 'no_plans_found'
    );
  END IF;

  RETURN jsonb_build_object(
    'code', v_code,
    'name', v_name,
    'name_ar', v_name_ar,
    'name_en', v_name_en,
    'tokens_initial', v_tokens_initial,
    'tokens_recurring', v_tokens_recurring,
    'allow_token_purchase', v_allow_token_purchase,
    'monthly_tokens', v_monthly_tokens,
    'multiplier', v_multiplier,
    'price', v_price,
    'price_monthly', v_price_monthly,
    'features', v_features
  );
END;
$$;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_plans_code ON plans(code);
CREATE INDEX IF NOT EXISTS idx_users_plan_code ON users(plan_code);