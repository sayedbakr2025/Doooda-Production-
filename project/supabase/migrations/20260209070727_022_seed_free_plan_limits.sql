/*
  # Seed FREE Plan Limits

  1. Changes
    - Add plan-based limits for FREE plan (5 daily, 100 monthly)
    - Add STANDARD and PRO plans for future use

  2. Security
    - Uses existing RLS policies
*/

-- Seed default plan-based limits
INSERT INTO ai_usage_limits (limit_type, plan_name, daily_limit, monthly_limit, is_unlimited, is_active)
SELECT 'plan_based', 'FREE', 5, 100, false, true
WHERE NOT EXISTS (
  SELECT 1 FROM ai_usage_limits WHERE limit_type = 'plan_based' AND plan_name = 'FREE'
);

INSERT INTO ai_usage_limits (limit_type, plan_name, daily_limit, monthly_limit, is_unlimited, is_active)
SELECT 'plan_based', 'STANDARD', 10, 200, false, true
WHERE NOT EXISTS (
  SELECT 1 FROM ai_usage_limits WHERE limit_type = 'plan_based' AND plan_name = 'STANDARD'
);

INSERT INTO ai_usage_limits (limit_type, plan_name, daily_limit, monthly_limit, is_unlimited, is_active)
SELECT 'plan_based', 'PRO', 0, 0, true, true
WHERE NOT EXISTS (
  SELECT 1 FROM ai_usage_limits WHERE limit_type = 'plan_based' AND plan_name = 'PRO'
);