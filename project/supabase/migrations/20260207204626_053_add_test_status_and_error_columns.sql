/*
  # Add test status and error columns to ai_providers

  1. Purpose
    - Separate test status (enum) from error message (text)
    - Enable better error categorization for AI provider tests
    - Keep last_test_result for backward compatibility

  2. New Columns
    - `last_test_status` (text) - Status: success, unauthorized, forbidden, invalid_model, network_error
    - `last_test_error` (text) - Human-readable error message (only when failed)

  3. Changes
    - Add columns with NULL defaults
    - No data migration needed (new tests will populate these fields)
    - Keep existing last_test_result column for compatibility

  4. Validation
    - Status must be one of: success, unauthorized, forbidden, invalid_model, network_error
    - Error message stored separately for clarity
*/

-- Add last_test_status column with validation
ALTER TABLE ai_providers 
ADD COLUMN IF NOT EXISTS last_test_status text 
CHECK (last_test_status IN ('success', 'unauthorized', 'forbidden', 'invalid_model', 'network_error'));

-- Add last_test_error column for detailed error messages
ALTER TABLE ai_providers 
ADD COLUMN IF NOT EXISTS last_test_error text;

-- Add index for filtering by test status
CREATE INDEX IF NOT EXISTS idx_ai_providers_test_status 
ON ai_providers(last_test_status) 
WHERE last_test_status IS NOT NULL;

-- Add comments for documentation
COMMENT ON COLUMN ai_providers.last_test_status IS 
  'Test connection status: success, unauthorized, forbidden, invalid_model, network_error';

COMMENT ON COLUMN ai_providers.last_test_error IS 
  'Detailed error message when test fails (NULL when success)';
