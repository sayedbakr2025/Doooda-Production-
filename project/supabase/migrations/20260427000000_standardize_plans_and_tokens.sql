-- ============================================
-- STANDARDIZE PLANS & TOKENS SYSTEM
-- Phase 1: Add columns to plans table + add uuid id
-- Phase 2: Add plan_id to users
-- Phase 10: Migrate existing users
-- ============================================

-- Phase 1a: Add uuid id to plans (if not exists)
ALTER TABLE plans ADD COLUMN IF NOT EXISTS id uuid PRIMARY KEY DEFAULT gen_random_uuid();

-- Phase 1b: Add new columns to plans
ALTER TABLE plans ADD COLUMN IF NOT EXISTS code text UNIQUE;
ALTER TABLE plans ADD COLUMN IF NOT EXISTS name_ar text DEFAULT '';
ALTER TABLE plans ADD COLUMN IF NOT EXISTS name_en text DEFAULT '';
ALTER TABLE plans ADD COLUMN IF NOT EXISTS tokens_initial integer DEFAULT 0;
ALTER TABLE plans ADD COLUMN IF NOT EXISTS tokens_recurring integer DEFAULT 0;
ALTER TABLE plans ADD COLUMN IF NOT EXISTS allow_token_purchase boolean DEFAULT false;
ALTER TABLE plans ADD COLUMN IF NOT EXISTS features jsonb DEFAULT '{}';
ALTER TABLE plans ADD COLUMN IF NOT EXISTS price_monthly numeric DEFAULT 0;

-- Backfill code column from existing name column
UPDATE plans SET
  code = CASE
    WHEN LOWER(name) = 'free' THEN 'free'
    WHEN LOWER(name) = 'pro' THEN 'pro'
    WHEN LOWER(name) = 'max' THEN 'max'
    ELSE LOWER(REPLACE(name, ' ', '_'))
  END,
  name_ar = CASE
    WHEN LOWER(name) = 'free' THEN 'كاتب هاوي'
    WHEN LOWER(name) = 'pro' THEN 'كاتب جاد'
    WHEN LOWER(name) = 'max' THEN 'كاتب محترف'
    ELSE name
  END,
  name_en = CASE
    WHEN LOWER(name) = 'free' THEN 'Hobbyist Writer'
    WHEN LOWER(name) = 'pro' THEN 'Serious Writer'
    WHEN LOWER(name) = 'max' THEN 'Professional Writer'
    ELSE name
  END,
  tokens_initial = CASE
    WHEN LOWER(name) = 'free' THEN 10000
    WHEN LOWER(name) = 'pro' THEN 120000
    WHEN LOWER(name) = 'max' THEN 300000
    ELSE 0
  END,
  tokens_recurring = CASE
    WHEN LOWER(name) = 'free' THEN 0
    WHEN LOWER(name) = 'pro' THEN 120000
    WHEN LOWER(name) = 'max' THEN 300000
    ELSE 0
  END,
  allow_token_purchase = CASE
    WHEN LOWER(name) = 'free' THEN false
    ELSE true
  END,
  features = CASE
    WHEN LOWER(name) = 'free' THEN
      '{"academy": true, "competitions": true, "max_projects": 3, "export_pdf": false, "export_word": false, "marketing": false, "doooda_daily_limit": 5, "doooda_monthly_limit": 50, "doooda_max_tokens": 1000, "doooda_context_budget": 800}'::jsonb
    WHEN LOWER(name) = 'pro' THEN
      '{"academy": true, "competitions": true, "max_projects": 15, "export_pdf": true, "export_word": true, "marketing": true, "doooda_daily_limit": 30, "doooda_monthly_limit": 500, "doooda_max_tokens": 2000, "doooda_context_budget": 2000}'::jsonb
    WHEN LOWER(name) = 'max' THEN
      '{"academy": true, "competitions": true, "max_projects": 50, "export_pdf": true, "export_word": true, "marketing": true, "doooda_daily_limit": null, "doooda_monthly_limit": null, "doooda_max_tokens": 2000, "doooda_context_budget": 2000}'::jsonb
    ELSE '{}'::jsonb
  END
WHERE code IS NULL OR code = '';

-- Phase 2: Add plan_id to users (keep plan text column for backward compat)
ALTER TABLE users ADD COLUMN IF NOT EXISTS plan_id uuid REFERENCES plans(id);

-- Backfill plan_id from existing plan column
UPDATE users u SET plan_id = p.id
FROM plans p
WHERE LOWER(u.plan) = LOWER(p.name) AND u.plan_id IS NULL;

-- Create helper function: get_user_plan
CREATE OR REPLACE FUNCTION get_user_plan(p_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_plan_record record;
BEGIN
  SELECT p.id, p.code, p.name, p.name_ar, p.name_en,
         p.tokens_initial, p.tokens_recurring, p.allow_token_purchase,
         p.monthly_tokens, p.multiplier, p.price, p.price_monthly, p.features
  INTO v_plan_record
  FROM plans p
  JOIN users u ON u.plan_id = p.id OR LOWER(u.plan) = LOWER(p.name)
  WHERE u.id = p_user_id
  LIMIT 1;

  IF v_plan_record IS NULL THEN
    SELECT p.id, p.code, p.name, p.name_ar, p.name_en,
           p.tokens_initial, p.tokens_recurring, p.allow_token_purchase,
           p.monthly_tokens, p.multiplier, p.price, p.price_monthly, p.features
    INTO v_plan_record
    FROM plans p
    WHERE LOWER(p.name) = 'free'
    LIMIT 1;
  END IF;

  IF v_plan_record IS NULL THEN
    RETURN jsonb_build_object(
      'code', 'free',
      'name', 'free',
      'error', 'no_plans_found'
    );
  END IF;

  RETURN jsonb_build_object(
    'plan_id', v_plan_record.id,
    'code', v_plan_record.code,
    'name', v_plan_record.name,
    'name_ar', v_plan_record.name_ar,
    'name_en', v_plan_record.name_en,
    'tokens_initial', v_plan_record.tokens_initial,
    'tokens_recurring', v_plan_record.tokens_recurring,
    'allow_token_purchase', v_plan_record.allow_token_purchase,
    'monthly_tokens', v_plan_record.monthly_tokens,
    'multiplier', v_plan_record.multiplier,
    'price', v_plan_record.price,
    'price_monthly', v_plan_record.price_monthly,
    'features', v_plan_record.features
  );
END;
$$;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_plans_code ON plans(code);
CREATE INDEX IF NOT EXISTS idx_users_plan_id ON users(plan_id);