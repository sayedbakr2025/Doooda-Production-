/*
  # Add Summary Column to Chapters and Fix Characters Delete RLS

  1. Problem
    - chapters table is missing 'summary' column
    - Frontend code expects 'summary' field when creating chapters
    - characters soft-delete RLS policy is blocking updates

  2. Changes
    - Add 'summary' column to chapters table
    - summary is used for quick previews, content is for full chapter text
    - Fix characters soft-delete RLS policy to allow deleted_at updates

  3. Impact
    - Chapter creation will now work correctly
    - Character deletion (soft-delete) will work correctly
*/

-- Add summary column to chapters if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'chapters' AND column_name = 'summary'
  ) THEN
    ALTER TABLE chapters ADD COLUMN summary text DEFAULT '';
  END IF;
END $$;

-- Fix characters soft-delete policy to allow updating deleted_at
DROP POLICY IF EXISTS "Writers can soft-delete own characters" ON characters;

CREATE POLICY "Writers can soft-delete own characters"
  ON characters FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());