-- Fix: Add plan_code to users and create helper function
-- Drop existing function first if it has different return type
DROP FUNCTION IF EXISTS get_user_plan(uuid);

-- Add plan_code column to users
ALTER TABLE users ADD COLUMN IF NOT EXISTS plan_code text;

-- Backfill plan_code from existing plan column
UPDATE users SET plan_code = LOWER(plan) WHERE plan_code IS NULL;

-- Create helper function: get_user_plan
CREATE OR REPLACE FUNCTION get_user_plan(p_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_plan_record record;
BEGIN
  SELECT p.code, p.name, p.name_ar, p.name_en,
         p.tokens_initial, p.tokens_recurring, p.allow_token_purchase,
         p.monthly_tokens, p.multiplier, p.price, p.price_monthly, p.features
  INTO v_plan_record
  FROM plans p
  JOIN users u ON LOWER(u.plan) = LOWER(p.name) OR LOWER(u.plan) = LOWER(p.code) OR u.plan_code = p.code
  WHERE u.id = p_user_id
  LIMIT 1;

  IF v_plan_record IS NULL THEN
    SELECT p.code, p.name, p.name_ar, p.name_en,
           p.tokens_initial, p.tokens_recurring, p.allow_token_purchase,
           p.monthly_tokens, p.multiplier, p.price, p.price_monthly, p.features
    INTO v_plan_record
    FROM plans p
    WHERE LOWER(p.name) = 'free' OR LOWER(p.code) = 'free'
    LIMIT 1;
  END IF;

  IF v_plan_record IS NULL THEN
    RETURN jsonb_build_object(
      'code', 'free',
      'name', 'free',
      'name_ar', 'كاتب هاوي',
      'name_en', 'Hobbyist Writer',
      'error', 'no_plans_found'
    );
  END IF;

  RETURN jsonb_build_object(
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
CREATE INDEX IF NOT EXISTS idx_users_plan_code ON users(plan_code);