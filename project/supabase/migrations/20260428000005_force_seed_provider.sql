-- Force seed doooda_config and DeepSeek provider
-- Clear any stale rows first, then insert fresh

-- 1. Delete any existing disabled/empty rows
DELETE FROM doooda_config WHERE is_enabled IS NULL OR is_enabled = false;
DELETE FROM ai_providers WHERE api_key_encrypted IS NULL OR api_key_encrypted = '';

-- 2. Insert doooda_config if empty
INSERT INTO doooda_config (is_enabled)
SELECT true
WHERE NOT EXISTS (SELECT 1 FROM doooda_config LIMIT 1);

-- 3. Update existing config to be enabled
UPDATE doooda_config SET is_enabled = true;

-- 4. Insert DeepSeek provider with placeholder key
-- Admin must set the real API key via admin panel
INSERT INTO ai_providers (provider_name, model_name, api_key_encrypted, is_enabled, is_active, is_default)
VALUES ('deepseek', 'deepseek-chat', 'sk-placeholder-set-via-admin', true, true, true)
ON CONFLICT DO NOTHING;

-- 5. Ensure DeepSeek is active
UPDATE ai_providers SET is_active = true, is_enabled = true WHERE provider_name = 'deepseek';