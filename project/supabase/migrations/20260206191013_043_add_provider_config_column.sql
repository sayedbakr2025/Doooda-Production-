/*
  # Add provider_config column to ai_providers

  1. Modified Tables
    - `ai_providers`
      - `provider_config` (jsonb, default '{}') - Stores provider-specific configuration
        such as project_id for Gemini, custom headers, etc.

  2. Purpose
    - Enables provider-specific configuration without schema changes
    - Future providers can store arbitrary config here
    - Existing columns (api_endpoint, model_name) remain as primary fields
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'ai_providers' AND column_name = 'provider_config'
  ) THEN
    ALTER TABLE ai_providers ADD COLUMN provider_config jsonb NOT NULL DEFAULT '{}'::jsonb;
  END IF;
END $$;
