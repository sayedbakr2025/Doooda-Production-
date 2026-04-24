/*
  # Fix ai_usage_logs INSERT policy for SECURITY DEFINER functions

  ## Problem
  The `log_and_deduct_tokens` function is SECURITY DEFINER and runs as the
  `postgres` role. The INSERT policy on `ai_usage_logs` only allows role
  `authenticated`, so the function fails with an RLS violation which surfaces
  as "Failed to process token usage".

  ## Changes
  - Drop the existing INSERT policy that restricts to `authenticated` only
  - Create a new INSERT policy that also allows the `postgres` role (used by
    SECURITY DEFINER functions like log_and_deduct_tokens)
*/

DROP POLICY IF EXISTS "ai_logs_insert_policy" ON ai_usage_logs;

CREATE POLICY "ai_logs_insert_policy"
  ON ai_usage_logs
  FOR INSERT
  TO authenticated, postgres
  WITH CHECK (
    (SELECT (auth.jwt() ->> 'role'::text)) = 'service_role'
    OR user_id = (SELECT auth.uid())
    OR current_user = 'postgres'
  );
