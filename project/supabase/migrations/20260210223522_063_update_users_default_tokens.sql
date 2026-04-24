/*
  # Update Users Table Default Tokens

  1. Changes
    - Change default tokens_balance from 5000 to 1000 for new users
    - This aligns with the free plan allocation
    
  2. Notes
    - Existing users keep their current balance
    - Only new users get 1000 tokens
*/

-- Update default value for tokens_balance
ALTER TABLE users 
ALTER COLUMN tokens_balance SET DEFAULT 1000;
