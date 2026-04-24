/*
  # Add is_active field to chapters table

  1. Changes
    - Add `is_active` boolean column to chapters table
    - Default value is true (active)
    - All existing chapters are set to active by default
  
  2. Purpose
    - Enable/disable chapters without deleting them
    - Inactive chapters don't affect ordering or calculations
    - Used when executing plot to disable pre-existing chapters
  
  3. Notes
    - is_active = true: chapter is active and counted
    - is_active = false: chapter is disabled (soft disable)
    - Different from deleted_at (soft delete)
*/

-- Add is_active column to chapters table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'chapters' AND column_name = 'is_active'
  ) THEN
    ALTER TABLE chapters ADD COLUMN is_active boolean DEFAULT true NOT NULL;
  END IF;
END $$;

-- Create index for faster queries filtering by is_active
CREATE INDEX IF NOT EXISTS idx_chapters_is_active ON chapters(project_id, is_active) WHERE deleted_at IS NULL;