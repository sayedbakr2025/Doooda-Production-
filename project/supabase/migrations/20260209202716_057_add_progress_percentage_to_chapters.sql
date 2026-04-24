/*
  # Add Progress Percentage to Chapters

  1. Problem
    - scenes trigger tries to update chapters.progress_percentage
    - Column doesn't exist in chapters table
    - This breaks scene creation

  2. Solution
    - Add progress_percentage column to chapters
    - Tracks completion percentage based on completed scenes
    - Calculated automatically by scenes trigger

  3. Impact
    - Scene creation will now work correctly
    - Chapter progress tracking enabled
*/

-- Add progress_percentage column to chapters if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'chapters' AND column_name = 'progress_percentage'
  ) THEN
    ALTER TABLE chapters ADD COLUMN progress_percentage integer DEFAULT 0 CHECK (progress_percentage >= 0 AND progress_percentage <= 100);
  END IF;
END $$;