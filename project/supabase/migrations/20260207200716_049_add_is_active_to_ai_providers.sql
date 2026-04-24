/*
  # Add is_active column to ai_providers

  1. Changes
    - Add `is_active` boolean column to `ai_providers` table
    - Set default to false
    - Add unique partial index to ensure only one provider can be active
    - Migrate existing active_provider_id from doooda_config to is_active flag

  2. Infrastructure Layer
    - Providers now own their active state directly
    - No dependency on external configuration tables
    - Constraint ensures single active provider at database level

  3. Migration Logic
    - If a provider is set as active in doooda_config, mark it as is_active=true
    - All other providers get is_active=false
    - This is a one-time data migration
*/

-- Add is_active column
ALTER TABLE ai_providers 
ADD COLUMN IF NOT EXISTS is_active boolean DEFAULT false;

-- Migrate active provider from doooda_config to is_active
DO $$
DECLARE
  active_id uuid;
BEGIN
  -- Get the currently active provider ID from doooda_config
  SELECT active_provider_id INTO active_id
  FROM doooda_config
  LIMIT 1;

  -- If there's an active provider, mark it
  IF active_id IS NOT NULL THEN
    UPDATE ai_providers
    SET is_active = true
    WHERE id = active_id;
  END IF;
END $$;

-- Create unique partial index to ensure only one active provider
CREATE UNIQUE INDEX IF NOT EXISTS idx_ai_one_active 
ON ai_providers(is_active) 
WHERE is_active = true;

-- Create index for quick lookup of active provider
CREATE INDEX IF NOT EXISTS idx_ai_providers_active 
ON ai_providers(is_active);

-- Add trigger to automatically deactivate other providers when one is activated
CREATE OR REPLACE FUNCTION ensure_single_active_provider()
RETURNS TRIGGER AS $$
BEGIN
  -- If this provider is being set to active, deactivate all others
  IF NEW.is_active = true AND (TG_OP = 'INSERT' OR OLD.is_active = false) THEN
    UPDATE ai_providers
    SET is_active = false
    WHERE id != NEW.id AND is_active = true;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_ensure_single_active_provider ON ai_providers;
CREATE TRIGGER trigger_ensure_single_active_provider
  BEFORE INSERT OR UPDATE OF is_active ON ai_providers
  FOR EACH ROW
  EXECUTE FUNCTION ensure_single_active_provider();
