-- Seed doooda_config and a default DeepSeek provider
-- These are required for Ask Doooda to function

-- 1. Ensure doooda_config has an enabled row (only is_enabled column is guaranteed)
INSERT INTO doooda_config (is_enabled)
VALUES (true)
ON CONFLICT DO NOTHING;

-- Make sure it's enabled
UPDATE doooda_config SET is_enabled = true WHERE is_enabled IS NULL OR is_enabled = false;

-- 2. Insert a DeepSeek provider if none exists
-- The actual API key must be set via the admin panel
INSERT INTO ai_providers (provider_name, model_name, api_key_encrypted, is_enabled, is_active, is_default)
VALUES ('deepseek', 'deepseek-chat', '', true, true, true)
ON CONFLICT DO NOTHING;

-- Ensure at least one provider is active
UPDATE ai_providers SET is_active = true, is_enabled = true WHERE provider_name = 'deepseek';