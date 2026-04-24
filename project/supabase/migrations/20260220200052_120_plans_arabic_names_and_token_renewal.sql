/*
  # Plans: Arabic Names + Token Renewal on Plan Change

  ## Changes

  ### 1. Add Arabic name columns to plans table
  - `name_ar` — Arabic display name of the plan (e.g. مجاني, احترافي, الأقصى)
  - `label_ar` — Optional Arabic marketing label (e.g. الأكثر شعبية)

  ### 2. Seed Arabic names for existing plans

  ### 3. Token renewal function + trigger
  - `renew_tokens_on_plan_change()` — When a user's plan is updated, their
    tokens_balance is set to the new plan's monthly_tokens value.
  - Trigger fires on UPDATE of the `plan` column in the `users` table.
  - Only renews when the plan actually changes (OLD.plan <> NEW.plan).
  - Does NOT touch tokens when only other fields (name, email, etc.) change.
  - Safe: uses IF NOT EXISTS for function/trigger creation.
*/

-- ─────────────────────────────────────────
-- 1. Add Arabic name columns to plans
-- ─────────────────────────────────────────
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'plans' AND column_name = 'name_ar'
  ) THEN
    ALTER TABLE plans ADD COLUMN name_ar text NOT NULL DEFAULT '';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'plans' AND column_name = 'label_ar'
  ) THEN
    ALTER TABLE plans ADD COLUMN label_ar text NOT NULL DEFAULT '';
  END IF;
END $$;

-- ─────────────────────────────────────────
-- 2. Seed Arabic names for default plans
-- ─────────────────────────────────────────
UPDATE plans SET name_ar = 'مجاني',     label_ar = ''              WHERE name = 'free';
UPDATE plans SET name_ar = 'احترافي',   label_ar = 'الأكثر شعبية' WHERE name = 'pro';
UPDATE plans SET name_ar = 'الأقصى',    label_ar = 'الأقوى'       WHERE name = 'max';

-- ─────────────────────────────────────────
-- 3. Token renewal trigger
-- ─────────────────────────────────────────

CREATE OR REPLACE FUNCTION renew_tokens_on_plan_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_tokens integer;
BEGIN
  IF OLD.plan IS DISTINCT FROM NEW.plan THEN
    SELECT monthly_tokens INTO new_tokens
    FROM plans
    WHERE name = NEW.plan;

    IF new_tokens IS NOT NULL THEN
      NEW.tokens_balance := new_tokens;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_renew_tokens_on_plan_change ON users;

CREATE TRIGGER trg_renew_tokens_on_plan_change
  BEFORE UPDATE OF plan ON users
  FOR EACH ROW
  EXECUTE FUNCTION renew_tokens_on_plan_change();
