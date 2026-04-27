/*
  # Token Rollover System + Transaction Tracking

  ## Changes

  ### 1. Add max_token_cap to plans table
  - Prevents token hoarding abuse
  - Applied during renewal: new_balance = LEAST(current + recurring, max_cap)
  - NULL means no cap (unlimited accumulation)

  ### 2. Create token_transactions table
  - Tracks every token movement (renewal, usage, purchase, admin_grant, admin_deduct)
  - Replaces ad-hoc tracking in ai_usage_logs for balance changes
  - Each row: user_id, type, amount, balance_after, created_at

  ### 3. Replace renew_tokens_on_plan_change trigger
  OLD: Resets tokens_balance to monthly_tokens (destroys remaining)
  NEW: Adds tokens_recurring on top of remaining tokens, capped by max_token_cap
  Also handles downgrade by applying new plan's tokens_recurring only

  ### 4. Create renew_monthly_tokens() function
  For future use (cron job or webhook):
  - Reads each user's plan via get_user_plan
  - Adds tokens_recurring to current balance
  - Caps at max_token_cap
  - Logs renewal in token_transactions

  ### 5. Update log_and_deduct_tokens to record in token_transactions
  Every deduction is now tracked in token_transactions with 'usage' type

  ### 6. Fix /me edge function default tokens
  New users now get tokens_initial from the free plan instead of hardcoded 1000
*/

-- ═══════════════════════════════════════════
-- 1. Add max_token_cap to plans
-- ═══════════════════════════════════════════
ALTER TABLE plans ADD COLUMN IF NOT EXISTS max_token_cap integer;

UPDATE plans SET max_token_cap = 200000 WHERE name = 'free';
UPDATE plans SET max_token_cap = 500000 WHERE name = 'pro';
UPDATE plans SET max_token_cap = NULL WHERE name = 'max';

ALTER TABLE plans ALTER COLUMN max_token_cap DROP DEFAULT;

-- ═══════════════════════════════════════════
-- 2. Create token_transactions table
-- ═══════════════════════════════════════════
CREATE TABLE IF NOT EXISTS token_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN ('renewal', 'usage', 'purchase', 'admin_grant', 'admin_deduct', 'initial', 'rollback')),
  amount integer NOT NULL,
  balance_after integer NOT NULL,
  description text,
  reference_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_token_transactions_user_id ON token_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_token_transactions_type ON token_transactions(type);
CREATE INDEX IF NOT EXISTS idx_token_transactions_created_at ON token_transactions(created_at DESC);

ALTER TABLE token_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own token transactions" ON token_transactions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage all token transactions" ON token_transactions
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated users can insert own token transactions" ON token_transactions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- ═══════════════════════════════════════════
-- 3. Replace renew_tokens_on_plan_change trigger
-- ROLLOVER: keeps remaining tokens + adds new plan's tokens_recurring
-- Caps at max_token_cap if set
-- ═══════════════════════════════════════════
CREATE OR REPLACE FUNCTION renew_tokens_on_plan_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
DECLARE
  v_tokens_recurring integer;
  v_max_cap integer;
  v_new_balance integer;
BEGIN
  IF OLD.plan IS DISTINCT FROM NEW.plan THEN
    SELECT tokens_recurring, max_token_cap INTO v_tokens_recurring, v_max_cap
    FROM plans
    WHERE LOWER(name) = LOWER(NEW.plan) OR LOWER(code) = LOWER(NEW.plan)
    LIMIT 1;

    IF v_tokens_recurring IS NOT NULL AND v_tokens_recurring > 0 THEN
      v_new_balance := NEW.tokens_balance + v_tokens_recurring;

      IF v_max_cap IS NOT NULL THEN
        v_new_balance := LEAST(v_new_balance, v_max_cap);
      END IF;

      NEW.tokens_balance := v_new_balance;
    END IF;

    INSERT INTO token_transactions (user_id, type, amount, balance_after, description)
    VALUES (
      NEW.id,
      'renewal',
      v_tokens_recurring,
      NEW.tokens_balance,
      'Plan changed to ' || NEW.plan || ': added ' || COALESCE(v_tokens_recurring, 0) || ' recurring tokens (rollover)'
    );
  END IF;

  RETURN NEW;
END;
$$;

-- ═══════════════════════════════════════════
-- 4. Create renew_monthly_tokens() function
-- For cron/webhook use: adds tokens_recurring to ALL active users
-- ═══════════════════════════════════════════
CREATE OR REPLACE FUNCTION renew_monthly_tokens(p_dry_run boolean DEFAULT false)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
DECLARE
  v_user record;
  v_tokens_recurring integer;
  v_max_cap integer;
  v_new_balance integer;
  v_count integer := 0;
  v_skipped integer := 0;
BEGIN
  FOR v_user IN
    SELECT u.id, u.tokens_balance, u.plan, u.plan_code
    FROM users u
    WHERE u.plan IS NOT NULL
  LOOP
    SELECT tokens_recurring, max_token_cap INTO v_tokens_recurring, v_max_cap
    FROM plans
    WHERE LOWER(name) = LOWER(v_user.plan) OR LOWER(code) = LOWER(COALESCE(v_user.plan_code, v_user.plan))
    LIMIT 1;

    IF v_tokens_recurring IS NULL OR v_tokens_recurring = 0 THEN
      v_skipped := v_skipped + 1;
      CONTINUE;
    END IF;

    v_new_balance := v_user.tokens_balance + v_tokens_recurring;

    IF v_max_cap IS NOT NULL THEN
      v_new_balance := LEAST(v_new_balance, v_max_cap);
    END IF;

    IF NOT p_dry_run THEN
      UPDATE users
      SET tokens_balance = v_new_balance, updated_at = now()
      WHERE id = v_user.id;

      INSERT INTO token_transactions (user_id, type, amount, balance_after, description)
      VALUES (
        v_user.id,
        'renewal',
        v_tokens_recurring,
        v_new_balance,
        'Monthly renewal: added ' || v_tokens_recurring || ' recurring tokens'
      );
    END IF;

    v_count := v_count + 1;
  END LOOP;

  RETURN jsonb_build_object(
    'success', true,
    'users_renewed', v_count,
    'users_skipped', v_skipped,
    'dry_run', p_dry_run
  );
END;
$$;

GRANT EXECUTE ON FUNCTION renew_monthly_tokens(boolean) TO postgres, service_role;

-- ═══════════════════════════════════════════
-- 5. Update log_and_deduct_tokens to record in token_transactions
-- ═══════════════════════════════════════════
CREATE OR REPLACE FUNCTION log_and_deduct_tokens(
  p_user_id uuid,
  p_feature text,
  p_provider text,
  p_model text,
  p_prompt_tokens integer,
  p_completion_tokens integer,
  p_multiplier numeric DEFAULT 2.0,
  p_request_metadata jsonb DEFAULT '{}',
  p_response_metadata jsonb DEFAULT '{}'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
DECLARE
  v_total_tokens integer;
  v_final_cost integer;
  v_current_balance integer;
  v_remaining_balance integer;
  v_log_id uuid;
BEGIN
  v_total_tokens := p_prompt_tokens + p_completion_tokens;

  v_final_cost := GREATEST(
    CAST((v_total_tokens * p_multiplier) AS integer),
    50
  );

  SELECT tokens_balance INTO v_current_balance
  FROM users
  WHERE id = p_user_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'User not found';
  END IF;

  IF v_current_balance < v_final_cost THEN
    INSERT INTO ai_usage_logs (
      user_id, feature, provider, model,
      prompt_tokens, completion_tokens, total_tokens,
      multiplier, final_cost, status, error_message,
      request_metadata, response_metadata
    ) VALUES (
      p_user_id, p_feature, p_provider, p_model,
      p_prompt_tokens, p_completion_tokens, v_total_tokens,
      p_multiplier, v_final_cost, 'insufficient_tokens',
      'User does not have sufficient token balance',
      p_request_metadata, p_response_metadata
    );

    INSERT INTO token_transactions (user_id, type, amount, balance_after, description)
    VALUES (
      p_user_id, 'usage', 0, v_current_balance,
      'Insufficient tokens for ' || p_feature || ' (needed ' || v_final_cost || ', had ' || v_current_balance || ')'
    );

    RETURN jsonb_build_object(
      'success', false,
      'error', 'insufficient_tokens',
      'required', v_final_cost,
      'available', v_current_balance
    );
  END IF;

  UPDATE users
  SET
    tokens_balance = tokens_balance - v_final_cost,
    updated_at = now()
  WHERE id = p_user_id;

  v_remaining_balance := v_current_balance - v_final_cost;

  INSERT INTO ai_usage_logs (
    user_id, feature, provider, model,
    prompt_tokens, completion_tokens, total_tokens,
    multiplier, final_cost, status,
    request_metadata, response_metadata
  ) VALUES (
    p_user_id, p_feature, p_provider, p_model,
    p_prompt_tokens, p_completion_tokens, v_total_tokens,
    p_multiplier, v_final_cost, 'success',
    p_request_metadata, p_response_metadata
  )
  RETURNING id INTO v_log_id;

  INSERT INTO token_transactions (user_id, type, amount, balance_after, description)
  VALUES (
    p_user_id, 'usage', v_final_cost, v_remaining_balance,
    p_feature || ' (' || p_provider || '/' || p_model || ')'
  );

  RETURN jsonb_build_object(
    'success', true,
    'log_id', v_log_id,
    'tokens_deducted', v_final_cost,
    'tokens_remaining', v_remaining_balance,
    'prompt_tokens', p_prompt_tokens,
    'completion_tokens', p_completion_tokens,
    'total_tokens', v_total_tokens,
    'multiplier', p_multiplier
  );

EXCEPTION WHEN OTHERS THEN
  RAISE;
END;
$$;

GRANT EXECUTE ON FUNCTION log_and_deduct_tokens(uuid, text, text, text, integer, integer, numeric, jsonb, jsonb) TO postgres, authenticated, service_role;

-- ═══════════════════════════════════════════
-- 6. Helper: grant_initial_tokens
-- Called when a new user signs up to give them tokens_initial from their plan
-- ═══════════════════════════════════════════
CREATE OR REPLACE FUNCTION grant_initial_tokens(p_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
DECLARE
  v_tokens_initial integer;
  v_max_cap integer;
  v_current_balance integer;
  v_new_balance integer;
BEGIN
  SELECT tokens_initial, max_token_cap INTO v_tokens_initial, v_max_cap
  FROM plans
  WHERE LOWER(name) = 'free'
  LIMIT 1;

  IF v_tokens_initial IS NULL OR v_tokens_initial = 0 THEN
    v_tokens_initial := 10000;
  END IF;

  SELECT tokens_balance INTO v_current_balance
  FROM users
  WHERE id = p_user_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'user_not_found');
  END IF;

  v_new_balance := v_current_balance + v_tokens_initial;

  IF v_max_cap IS NOT NULL THEN
    v_new_balance := LEAST(v_new_balance, v_max_cap);
  END IF;

  UPDATE users
  SET tokens_balance = v_new_balance, updated_at = now()
  WHERE id = p_user_id;

  INSERT INTO token_transactions (user_id, type, amount, balance_after, description)
  VALUES (
    p_user_id,
    'initial',
    v_tokens_initial,
    v_new_balance,
    'Initial tokens grant (free plan welcome)'
  );

  RETURN jsonb_build_object(
    'success', true,
    'tokens_granted', v_tokens_initial,
    'balance_after', v_new_balance
  );
END;
$$;

GRANT EXECUTE ON FUNCTION grant_initial_tokens(uuid) TO postgres, authenticated, service_role;

-- ═══════════════════════════════════════════
-- 7. Helper: add_tokens (for admin grants or purchases)
-- Adds tokens and respects max_token_cap
-- ═══════════════════════════════════════════
CREATE OR REPLACE FUNCTION add_tokens(
  p_user_id uuid,
  p_amount integer,
  p_type text,
  p_description text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
DECLARE
  v_new_balance integer;
  v_max_cap integer;
  v_plan_code text;
BEGIN
  IF p_type NOT IN ('purchase', 'admin_grant', 'admin_deduct', 'bonus') THEN
    RAISE EXCEPTION 'Invalid type. Must be purchase, admin_grant, admin_deduct, or bonus';
  END IF;

  IF p_type = 'admin_deduct' AND p_amount > 0 THEN
    RAISE EXCEPTION 'admin_deduct amount must be negative';
  END IF;

  SELECT LOWER(COALESCE(plan_code, plan)) INTO v_plan_code
  FROM users WHERE id = p_user_id;

  SELECT max_token_cap INTO v_max_cap
  FROM plans
  WHERE LOWER(name) = v_plan_code OR LOWER(code) = v_plan_code
  LIMIT 1;

  UPDATE users
  SET tokens_balance = tokens_balance + p_amount, updated_at = now()
  WHERE id = p_user_id
  RETURNING tokens_balance INTO v_new_balance;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'user_not_found');
  END IF;

  IF v_max_cap IS NOT NULL AND v_new_balance > v_max_cap AND p_type != 'admin_deduct' THEN
    v_new_balance := v_max_cap;
    UPDATE users SET tokens_balance = v_max_cap, updated_at = now() WHERE id = p_user_id;
  END IF;

  IF v_new_balance < 0 THEN
    v_new_balance := 0;
    UPDATE users SET tokens_balance = 0, updated_at = now() WHERE id = p_user_id;
  END IF;

  INSERT INTO token_transactions (user_id, type, amount, balance_after, description)
  VALUES (p_user_id, p_type, p_amount, v_new_balance, p_description);

  RETURN jsonb_build_object(
    'success', true,
    'amount', p_amount,
    'balance_after', v_new_balance,
    'capped', v_max_cap IS NOT NULL AND (tokens_balance + p_amount) > v_max_cap
  );
END;
$$;

GRANT EXECUTE ON FUNCTION add_tokens(uuid, integer, text, text) TO postgres, authenticated, service_role;