/*
  # Add diacritize_text to AI Usage Logs Features

  1. Changes
    - Update CHECK constraint on ai_usage_logs.feature column
    - Add 'diacritize_text' to allowed features list

  2. Reason
    - Enable logging for diacritization feature
    - Fix constraint violation when calling log_and_deduct_tokens with feature='diacritize_text'
*/

ALTER TABLE ai_usage_logs
DROP CONSTRAINT IF EXISTS ai_usage_logs_feature_check;

ALTER TABLE ai_usage_logs
ADD CONSTRAINT ai_usage_logs_feature_check
CHECK (feature IN (
  'ask_doooda',
  'analyze_plot',
  'generate_content',
  'diacritize_text',
  'other'
));
