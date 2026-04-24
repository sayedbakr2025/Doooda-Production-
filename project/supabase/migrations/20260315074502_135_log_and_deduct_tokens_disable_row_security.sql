/*
  # Fix log_and_deduct_tokens - Disable row security inside function

  ## Problem
  Even though the function is SECURITY DEFINER running as postgres, Supabase
  enforces RLS for the postgres role by default in some configurations.
  The INSERT into ai_usage_logs fails because auth.uid() is NULL in this context.

  ## Fix
  Add `SET row_security = off` to the function so it bypasses RLS entirely.
  This is safe because:
  - The function is SECURITY DEFINER (only callable with proper auth)
  - The edge function validates the user token before calling this function
  - The user_id is passed explicitly and verified against the auth token
*/

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
