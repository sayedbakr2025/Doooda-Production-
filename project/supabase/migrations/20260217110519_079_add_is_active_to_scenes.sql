/*
  # Add is_active to scenes table

  1. Changes
    - Add is_active column to scenes table
    - Default to true for all existing and new scenes
    - Allows disabling/enabling scenes like chapters
  
  2. No breaking changes
    - All existing scenes will be active by default
*/

ALTER TABLE scenes 
ADD COLUMN IF NOT EXISTS is_active boolean DEFAULT true NOT NULL;

-- Set all existing scenes to active
UPDATE scenes SET is_active = true WHERE is_active IS NULL;
