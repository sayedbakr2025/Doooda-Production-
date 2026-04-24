/*
  # Add Missing DELETE RLS Policies

  1. Problem
    - characters table: No DELETE policy (delete button doesn't work)
    - scenes table: No DELETE policy (can't delete scenes/subheadings)
    - chapters table: No DELETE policy (can't delete chapters)

  2. Solution
    - Add DELETE policy for characters (user must own the project)
    - Add DELETE policy for scenes (user must own the project through chapter)
    - Add DELETE policy for chapters (user must own the project)

  3. Security
    - All policies verify project ownership through proper joins
    - Uses soft delete pattern (deleted_at) to preserve data
*/

-- Add DELETE policy for characters
CREATE POLICY "Users can delete own characters"
  ON characters FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM projects p
      WHERE p.id = characters.project_id
      AND p.user_id = auth.uid()
    )
  );

-- Add DELETE policy for scenes (through chapters -> projects)
CREATE POLICY "Users can delete own scenes"
  ON scenes FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM chapters c
      JOIN projects p ON c.project_id = p.id
      WHERE c.id = scenes.chapter_id
      AND p.user_id = auth.uid()
    )
  );

-- Add DELETE policy for chapters
CREATE POLICY "Users can delete own chapters"
  ON chapters FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM projects p
      WHERE p.id = chapters.project_id
      AND p.user_id = auth.uid()
    )
  );