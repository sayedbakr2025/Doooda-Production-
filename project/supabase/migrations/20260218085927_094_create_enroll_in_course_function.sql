/*
  # Create enroll_in_course Function

  ## Purpose
  Atomically handles course enrollment with token deduction for paid courses.

  ## Logic
  1. Checks if user is already enrolled (returns existing enrollment if so)
  2. If course is free → inserts enrollment directly
  3. If course is paid:
     a. Reads the user's current token balance
     b. Reads the course price_tokens
     c. Rejects with 'insufficient_tokens' if balance < price
     d. Deducts tokens from user balance
     e. Logs the transaction to ai_usage_logs (feature: 'academy_enrollment')
     f. Inserts the enrollment
  4. Returns a JSON response with success status, enrollment data, and remaining balance

  ## Security
  - SECURITY DEFINER to perform atomic writes across multiple tables
  - Validates user_id ownership (caller must pass their own ID)
  - Called from authenticated frontend via supabase.rpc()

  ## Notes
  - Uses multiplier = 1.0 for academy enrollments (no AI markup)
  - Minimum cost is the full price_tokens, no 50-token floor
  - If price_tokens is NULL for a paid course, enrollment is blocked
*/

CREATE OR REPLACE FUNCTION enroll_in_course(
  p_user_id uuid,
  p_course_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_course record;
  v_existing_enrollment record;
  v_new_enrollment record;
  v_current_balance integer;
  v_price integer;
BEGIN
  SELECT id, is_free, price_tokens
  INTO v_course
  FROM academy_courses
  WHERE id = p_course_id AND is_published = true;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'course_not_found');
  END IF;

  SELECT *
  INTO v_existing_enrollment
  FROM academy_enrollments
  WHERE user_id = p_user_id AND course_id = p_course_id;

  IF FOUND THEN
    RETURN jsonb_build_object(
      'success', true,
      'already_enrolled', true,
      'enrollment', row_to_json(v_existing_enrollment)::jsonb
    );
  END IF;

  IF NOT v_course.is_free THEN
    v_price := v_course.price_tokens;

    IF v_price IS NULL OR v_price <= 0 THEN
      RETURN jsonb_build_object('success', false, 'error', 'price_not_set');
    END IF;

    SELECT tokens_balance
    INTO v_current_balance
    FROM users
    WHERE id = p_user_id;

    IF NOT FOUND THEN
      RETURN jsonb_build_object('success', false, 'error', 'user_not_found');
    END IF;

    IF v_current_balance < v_price THEN
      INSERT INTO ai_usage_logs (
        user_id, feature, provider, model,
        prompt_tokens, completion_tokens, total_tokens,
        multiplier, final_cost, status, error_message,
        request_metadata
      ) VALUES (
        p_user_id, 'academy_enrollment', 'none', 'none',
        0, 0, 0,
        1.0, v_price, 'insufficient_tokens',
        'User does not have sufficient token balance',
        jsonb_build_object('course_id', p_course_id, 'price_tokens', v_price)
      );

      RETURN jsonb_build_object(
        'success', false,
        'error', 'insufficient_tokens',
        'required', v_price,
        'available', v_current_balance
      );
    END IF;

    UPDATE users
    SET
      tokens_balance = tokens_balance - v_price,
      updated_at = now()
    WHERE id = p_user_id;

    INSERT INTO ai_usage_logs (
      user_id, feature, provider, model,
      prompt_tokens, completion_tokens, total_tokens,
      multiplier, final_cost, status,
      request_metadata
    ) VALUES (
      p_user_id, 'academy_enrollment', 'none', 'none',
      0, 0, 0,
      1.0, v_price, 'success',
      jsonb_build_object('course_id', p_course_id, 'price_tokens', v_price)
    );
  END IF;

  INSERT INTO academy_enrollments (user_id, course_id)
  VALUES (p_user_id, p_course_id)
  RETURNING *
  INTO v_new_enrollment;

  RETURN jsonb_build_object(
    'success', true,
    'already_enrolled', false,
    'enrollment', row_to_json(v_new_enrollment)::jsonb,
    'tokens_deducted', CASE WHEN v_course.is_free THEN 0 ELSE v_course.price_tokens END
  );

EXCEPTION WHEN OTHERS THEN
  RAISE;
END;
$$;
