/*
  # Add Test AI Provider

  1. Purpose
    - Add a test OpenAI provider for development
    - Enable doooda feature for testing

  2. Security
    - This is a test provider with dummy credentials
    - Should be replaced with real credentials in production
*/

INSERT INTO ai_providers (
  provider_name,
  api_key_encrypted,
  model_name,
  is_enabled,
  is_default
)
SELECT 
  'openai',
  'test-encrypted-key',
  'gpt-4',
  true,
  true
WHERE NOT EXISTS (
  SELECT 1 FROM ai_providers WHERE is_enabled = true
);