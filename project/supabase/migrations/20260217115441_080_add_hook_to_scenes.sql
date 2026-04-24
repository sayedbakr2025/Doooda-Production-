/*
  # Add Hook Field to Scenes

  1. Changes
    - Add `hook` column to scenes table
      - Text field to store the scene's hook (what makes readers continue)
      - Optional field with empty string as default
  
  2. Purpose
    - Allow writers to define the hook for each scene
    - This hook will be sent to AI for analysis and evaluation
    - Helps analyze how well the scene encourages continued reading

  3. Security
    - No RLS changes needed - existing policies cover the new field
*/

-- Add hook column to scenes table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'scenes' AND column_name = 'hook'
  ) THEN
    ALTER TABLE scenes ADD COLUMN hook text DEFAULT '';
  END IF;
END $$;