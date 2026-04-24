/*
  # Update Plan Token Values
  
  1. Changes
    - Update Free plan: 1,000 → 10,000 tokens
    - Update Pro plan: 20,000 → 100,000 tokens
    - Update Max plan: 100,000 → 250,000 tokens
    
  2. Data Migration
    - Grant all existing users their new token allocation based on current plan
    - Free users get 10,000 tokens
    - Pro users get 100,000 tokens
    - Max users get 250,000 tokens
    
  3. Security
    - Maintains existing RLS policies
*/

-- Update plan token values
UPDATE plans SET monthly_tokens = 10000 WHERE name = 'free';
UPDATE plans SET monthly_tokens = 100000 WHERE name = 'pro';
UPDATE plans SET monthly_tokens = 250000 WHERE name = 'max';

-- Grant tokens to all existing users based on their current plan
UPDATE users
SET tokens_balance = CASE 
  WHEN plan = 'free' THEN 10000
  WHEN plan = 'pro' THEN 100000
  WHEN plan = 'max' THEN 250000
  ELSE tokens_balance
END
WHERE plan IN ('free', 'pro', 'max');
