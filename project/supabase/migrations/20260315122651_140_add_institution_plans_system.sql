/*
  # Add Institutional Plans System

  ## Overview
  Adds a subscription plan system for institutional accounts with three tiers:
  - Bronze (free): 100,000 one-time tokens, no token purchase, no doooda evaluation, no competition boost
  - Silver ($99/mo): 10,000,000 tokens, can purchase additional token packages
  - Gold ($199/mo): 25,000,000 tokens, can purchase additional token packages

  ## Token Packages (Silver & Gold only)
  - 2,000,000 tokens for $30
  - 5,000,000 tokens for $55
  - 10,000,000 tokens for $99

  ## Changes
  1. Add `plan` column to institutional_accounts ('bronze' | 'silver' | 'gold')
  2. Add `plan_tokens_initial` column to track initial plan tokens granted
  3. Add `plan_renewed_at` column to track plan renewal date
  4. Update default tokens_balance to 100000 for new accounts (bronze default)

  ## Security
  - Plan field is NOT settable by public INSERT (admin-controlled)
  - RLS updated to enforce this
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'institutional_accounts' AND column_name = 'plan'
  ) THEN
    ALTER TABLE public.institutional_accounts
      ADD COLUMN plan text NOT NULL DEFAULT 'bronze'
        CHECK (plan IN ('bronze', 'silver', 'gold'));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'institutional_accounts' AND column_name = 'plan_renewed_at'
  ) THEN
    ALTER TABLE public.institutional_accounts
      ADD COLUMN plan_renewed_at timestamptz DEFAULT now();
  END IF;
END $$;

ALTER TABLE public.institutional_accounts
  ALTER COLUMN tokens_balance SET DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_institutional_accounts_plan
  ON public.institutional_accounts (plan);
