/*
  # Fix record_doooda_usage function - Add SECURITY DEFINER

  ## Problem
  The `record_doooda_usage` function was failing with "No API key found in request"
  because it lacked SECURITY DEFINER, causing it to run with the caller's permissions
  which may fail PostgREST authentication checks.

  ## Changes
  1. Recreate `record_doooda_usage` with SECURITY DEFINER so it always runs with
     postgres privileges regardless of the caller's authentication state.
  2. Add `user_id` column to `doooda_usage_logs` for better tracking (nullable).
  3. Update the function to record `user_id` via `auth.uid()`.
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'doooda_usage_logs' AND column_name = 'user_id'
  ) THEN
    ALTER TABLE public.doooda_usage_logs ADD COLUMN user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.record_doooda_usage(
  p_provider text,
  p_request_type text,
  p_tokens integer,
  p_status text,
  p_error text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
begin
  insert into public.doooda_usage_logs (
    user_id,
    provider,
    request_type,
    tokens_used,
    status,
    error_message,
    created_at
  )
  values (
    auth.uid(),
    p_provider,
    p_request_type,
    p_tokens,
    p_status,
    p_error,
    now()
  );
end;
$$;

GRANT EXECUTE ON FUNCTION public.record_doooda_usage(text, text, integer, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.record_doooda_usage(text, text, integer, text, text) TO anon;
