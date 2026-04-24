/*
  # Fix UPDATE Policies for Soft Delete

  1. Problem
    - UPDATE policies have WITH CHECK that prevents setting deleted_at
    - This causes "new row violates row-level security policy" error
    - Affects characters, chapters, and scenes tables

  2. Solution
    - Drop old UPDATE policies
    - Create new UPDATE policies that explicitly allow soft delete
    - Separate policy for normal updates (deleted_at IS NULL)
    - Separate policy for soft delete (setting deleted_at)

  3. Security
    - Normal updates still check deleted_at IS NULL
    - Soft delete only allows setting deleted_at, no other changes
*/

-- Fix characters table policies
DROP POLICY IF EXISTS "Writers can update own characters" ON characters;
DROP POLICY IF EXISTS "Writers can soft-delete own characters" ON characters;

CREATE POLICY "Writers can update own characters"
  ON characters FOR UPDATE
  TO authenticated
  USING (
    user_id = auth.uid()
    AND deleted_at IS NULL
  )
  WITH CHECK (
    user_id = auth.uid()
    AND deleted_at IS NULL
  );

CREATE POLICY "Writers can soft-delete own characters"
  ON characters FOR UPDATE
  TO authenticated
  USING (
    user_id = auth.uid()
    AND deleted_at IS NULL
  )
  WITH CHECK (
    user_id = auth.uid()
    AND deleted_at IS NOT NULL
  );

-- Fix chapters table policies
DROP POLICY IF EXISTS "Writers can update own chapters" ON chapters;
DROP POLICY IF EXISTS "Writers can soft-delete own chapters" ON chapters;

CREATE POLICY "Writers can update own chapters"
  ON chapters FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM projects p
      WHERE p.id = chapters.project_id
      AND p.user_id = auth.uid()
      AND p.deleted_at IS NULL
    )
    AND deleted_at IS NULL
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM projects p
      WHERE p.id = chapters.project_id
      AND p.user_id = auth.uid()
      AND p.deleted_at IS NULL
    )
    AND deleted_at IS NULL
  );

CREATE POLICY "Writers can soft-delete own chapters"
  ON chapters FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM projects p
      WHERE p.id = chapters.project_id
      AND p.user_id = auth.uid()
    )
    AND deleted_at IS NULL
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM projects p
      WHERE p.id = chapters.project_id
      AND p.user_id = auth.uid()
    )
    AND deleted_at IS NOT NULL
  );

-- Fix scenes table policies
DROP POLICY IF EXISTS "Writers can update own scenes" ON scenes;
DROP POLICY IF EXISTS "Writers can soft-delete own scenes" ON scenes;

CREATE POLICY "Writers can update own scenes"
  ON scenes FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM chapters c
      JOIN projects p ON p.id = c.project_id
      WHERE c.id = scenes.chapter_id
      AND p.user_id = auth.uid()
      AND p.deleted_at IS NULL
      AND c.deleted_at IS NULL
    )
    AND deleted_at IS NULL
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM chapters c
      JOIN projects p ON p.id = c.project_id
      WHERE c.id = scenes.chapter_id
      AND p.user_id = auth.uid()
      AND p.deleted_at IS NULL
      AND c.deleted_at IS NULL
    )
    AND deleted_at IS NULL
  );

CREATE POLICY "Writers can soft-delete own scenes"
  ON scenes FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM chapters c
      JOIN projects p ON p.id = c.project_id
      WHERE c.id = scenes.chapter_id
      AND p.user_id = auth.uid()
    )
    AND deleted_at IS NULL
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM chapters c
      JOIN projects p ON p.id = c.project_id
      WHERE c.id = scenes.chapter_id
      AND p.user_id = auth.uid()
    )
    AND deleted_at IS NOT NULL
  );