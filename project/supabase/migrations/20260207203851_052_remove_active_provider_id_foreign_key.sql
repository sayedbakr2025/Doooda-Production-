/*
  # Remove active_provider_id foreign key constraint

  1. Problem
    - doooda_config.active_provider_id has a foreign key to ai_providers(id)
    - This prevents deletion of AI providers that are referenced
    - We no longer use active_provider_id (is_active is the single source of truth)

  2. Changes
    - Drop the foreign key constraint
    - Set active_provider_id to NULL for all existing records
    - Column remains for backward compatibility but has no constraints

  3. Result
    - AI providers can be deleted freely
    - No circular dependencies
    - Provider lifecycle is independent of doooda_config
*/

-- First, find and drop the foreign key constraint
DO $$
DECLARE
  constraint_name text;
BEGIN
  -- Find the constraint name
  SELECT conname INTO constraint_name
  FROM pg_constraint
  WHERE conrelid = 'doooda_config'::regclass
    AND confrelid = 'ai_providers'::regclass
    AND contype = 'f';
  
  -- Drop it if found
  IF constraint_name IS NOT NULL THEN
    EXECUTE format('ALTER TABLE doooda_config DROP CONSTRAINT %I', constraint_name);
  END IF;
END $$;

-- Set all existing active_provider_id values to NULL
UPDATE doooda_config SET active_provider_id = NULL WHERE active_provider_id IS NOT NULL;

-- Add a comment to document that this field is deprecated
COMMENT ON COLUMN doooda_config.active_provider_id IS 'DEPRECATED: No longer used. Use ai_providers.is_active instead.';
