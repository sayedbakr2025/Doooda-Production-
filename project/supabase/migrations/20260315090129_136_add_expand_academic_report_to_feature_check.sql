/*
  # Add expand_academic_report to ai_usage_logs feature check constraint

  ## Problem
  The ai_usage_logs table has a CHECK constraint on the `feature` column that only allows:
  'ask_doooda', 'analyze_plot', 'generate_content', 'diacritize_text', 'other'

  The expand-academic-report edge function uses 'expand_academic_report' which violates this constraint,
  causing the log_and_deduct_tokens RPC to fail with a constraint violation error.

  ## Fix
  Drop the old constraint and recreate it with the missing feature values added.
*/

ALTER TABLE ai_usage_logs
  DROP CONSTRAINT IF EXISTS ai_usage_logs_feature_check;

ALTER TABLE ai_usage_logs
  ADD CONSTRAINT ai_usage_logs_feature_check
  CHECK (feature = ANY (ARRAY[
    'ask_doooda'::text,
    'analyze_plot'::text,
    'generate_content'::text,
    'diacritize_text'::text,
    'expand_academic_report'::text,
    'execute_plot'::text,
    'generate_kdp_blurb'::text,
    'other'::text
  ]));
