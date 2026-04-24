/*
  # Ensure All Users Have Tokens

  1. Changes
    - Update any existing users without tokens_balance or plan to have default values
    - Ensures backward compatibility for users created before token system

  2. Security
    - No RLS changes needed - this is a data fix only
*/

-- Update users without plan
UPDATE users
SET plan = 'free'
WHERE plan IS NULL;

-- Update users without tokens_balance
UPDATE users
SET tokens_balance = 5000
WHERE tokens_balance IS NULL OR tokens_balance = 0;
