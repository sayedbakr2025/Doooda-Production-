/*
  # Add Hook Field to Plot Scenes

  1. Changes
    - Add `hook` column to plot_scenes table
      - Text field to store the scene's hook in the plot
      - Optional field with empty string as default
  
  2. Purpose
    - Allow writers to define hooks when planning their plot
    - This hook will be transferred to actual scenes when plot is executed
    - Helps maintain continuity between planning and writing phases

  3. Security
    - No RLS changes needed - existing policies cover the new field
*/

-- Add hook column to plot_scenes table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'plot_scenes' AND column_name = 'hook'
  ) THEN
    ALTER TABLE plot_scenes ADD COLUMN hook text DEFAULT '';
  END IF;
END $$;