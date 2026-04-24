/*
  # Update Free plan limits for Ask Doooda

  1. Changes
    - Updates FREE plan ai_usage_limits from 0/0 (no access) to 3 daily / 30 monthly
    - This makes Ask Doooda a growth feature: visible and usable by all, with limits for free users

  2. Rationale
    - Free users get limited access to experience the feature
    - Paid plans retain higher or unlimited access
    - Enforcement remains server-side via check_doooda_access()
*/

UPDATE ai_usage_limits
SET daily_limit = 3,
    monthly_limit = 30,
    updated_at = now()
WHERE limit_type = 'plan_based'
  AND plan_name = 'FREE'
  AND is_active = true;
