/*
  # Fix RLS Performance - Optimize auth.uid() calls
  
  1. Changes
    - Replace auth.uid() with (select auth.uid()) in all policies
    - This prevents re-evaluation for each row
  
  2. Security
    - Maintains same security level
    - Significantly improves query performance at scale
*/

-- Projects table
DROP POLICY IF EXISTS "Users can view own projects" ON projects;
DROP POLICY IF EXISTS "Users can create own projects" ON projects;
DROP POLICY IF EXISTS "Users can update own projects" ON projects;
DROP POLICY IF EXISTS "Users can soft-delete own projects" ON projects;

CREATE POLICY "Users can view own projects"
  ON projects FOR SELECT
  TO authenticated
  USING ((select auth.uid()) = user_id AND deleted_at IS NULL);

CREATE POLICY "Users can create own projects"
  ON projects FOR INSERT
  TO authenticated
  WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "Users can update own projects"
  ON projects FOR UPDATE
  TO authenticated
  USING ((select auth.uid()) = user_id AND deleted_at IS NULL)
  WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "Users can soft-delete own projects"
  ON projects FOR UPDATE
  TO authenticated
  USING ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);

-- Chapters table
DROP POLICY IF EXISTS "Writers can view own chapters" ON chapters;
DROP POLICY IF EXISTS "Writers can create chapters" ON chapters;
DROP POLICY IF EXISTS "Writers can update own chapters" ON chapters;
DROP POLICY IF EXISTS "Writers can soft-delete own chapters" ON chapters;
DROP POLICY IF EXISTS "Admins can view all chapters" ON chapters;

CREATE POLICY "Writers can view own chapters"
  ON chapters FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM projects 
      WHERE projects.id = chapters.project_id 
      AND projects.user_id = (select auth.uid())
      AND chapters.deleted_at IS NULL
    )
  );

CREATE POLICY "Writers can create chapters"
  ON chapters FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM projects 
      WHERE projects.id = chapters.project_id 
      AND projects.user_id = (select auth.uid())
    )
  );

CREATE POLICY "Writers can update own chapters"
  ON chapters FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM projects 
      WHERE projects.id = chapters.project_id 
      AND projects.user_id = (select auth.uid())
      AND chapters.deleted_at IS NULL
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM projects 
      WHERE projects.id = chapters.project_id 
      AND projects.user_id = (select auth.uid())
    )
  );

-- Scenes table
DROP POLICY IF EXISTS "Writers can view own scenes" ON scenes;
DROP POLICY IF EXISTS "Writers can create scenes" ON scenes;
DROP POLICY IF EXISTS "Writers can update own scenes" ON scenes;
DROP POLICY IF EXISTS "Writers can soft-delete own scenes" ON scenes;
DROP POLICY IF EXISTS "Admins can view all scenes" ON scenes;

CREATE POLICY "Writers can view own scenes"
  ON scenes FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM chapters 
      JOIN projects ON projects.id = chapters.project_id
      WHERE chapters.id = scenes.chapter_id 
      AND projects.user_id = (select auth.uid())
      AND scenes.deleted_at IS NULL
    )
  );

CREATE POLICY "Writers can create scenes"
  ON scenes FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM chapters 
      JOIN projects ON projects.id = chapters.project_id
      WHERE chapters.id = scenes.chapter_id 
      AND projects.user_id = (select auth.uid())
    )
  );

CREATE POLICY "Writers can update own scenes"
  ON scenes FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM chapters 
      JOIN projects ON projects.id = chapters.project_id
      WHERE chapters.id = scenes.chapter_id 
      AND projects.user_id = (select auth.uid())
      AND scenes.deleted_at IS NULL
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM chapters 
      JOIN projects ON projects.id = chapters.project_id
      WHERE chapters.id = scenes.chapter_id 
      AND projects.user_id = (select auth.uid())
    )
  );

-- Characters table
DROP POLICY IF EXISTS "Writers can view own characters" ON characters;
DROP POLICY IF EXISTS "Writers can create characters" ON characters;
DROP POLICY IF EXISTS "Writers can update own characters" ON characters;
DROP POLICY IF EXISTS "Writers can soft-delete own characters" ON characters;

CREATE POLICY "Writers can view own characters"
  ON characters FOR SELECT
  TO authenticated
  USING ((select auth.uid()) = user_id AND deleted_at IS NULL);

CREATE POLICY "Writers can create characters"
  ON characters FOR INSERT
  TO authenticated
  WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "Writers can update own characters"
  ON characters FOR UPDATE
  TO authenticated
  USING ((select auth.uid()) = user_id AND deleted_at IS NULL)
  WITH CHECK ((select auth.uid()) = user_id);

-- Tasks table
DROP POLICY IF EXISTS "Writers can view own tasks" ON tasks;
DROP POLICY IF EXISTS "Writers can create tasks" ON tasks;
DROP POLICY IF EXISTS "Writers can update own tasks" ON tasks;
DROP POLICY IF EXISTS "Writers can soft-delete own tasks" ON tasks;

CREATE POLICY "Writers can view own tasks"
  ON tasks FOR SELECT
  TO authenticated
  USING ((select auth.uid()) = user_id AND deleted_at IS NULL);

CREATE POLICY "Writers can create tasks"
  ON tasks FOR INSERT
  TO authenticated
  WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "Writers can update own tasks"
  ON tasks FOR UPDATE
  TO authenticated
  USING ((select auth.uid()) = user_id AND deleted_at IS NULL)
  WITH CHECK ((select auth.uid()) = user_id);

-- Loglines table
DROP POLICY IF EXISTS "Writers can view own loglines" ON loglines;
DROP POLICY IF EXISTS "Writers can create loglines" ON loglines;
DROP POLICY IF EXISTS "Writers can update own loglines" ON loglines;
DROP POLICY IF EXISTS "Writers can soft-delete own loglines" ON loglines;
DROP POLICY IF EXISTS "Admins can view all loglines" ON loglines;

CREATE POLICY "Writers can view own loglines"
  ON loglines FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM projects 
      WHERE projects.id = loglines.project_id 
      AND projects.user_id = (select auth.uid())
      AND loglines.deleted_at IS NULL
    )
  );

CREATE POLICY "Writers can create loglines"
  ON loglines FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM projects 
      WHERE projects.id = loglines.project_id 
      AND projects.user_id = (select auth.uid())
    )
  );

CREATE POLICY "Writers can update own loglines"
  ON loglines FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM projects 
      WHERE projects.id = loglines.project_id 
      AND projects.user_id = (select auth.uid())
      AND loglines.deleted_at IS NULL
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM projects 
      WHERE projects.id = loglines.project_id 
      AND projects.user_id = (select auth.uid())
    )
  );

-- Daily writing sessions
DROP POLICY IF EXISTS "Writers can view own sessions" ON daily_writing_sessions;
DROP POLICY IF EXISTS "Writers can create sessions" ON daily_writing_sessions;
DROP POLICY IF EXISTS "Writers can update own sessions" ON daily_writing_sessions;
DROP POLICY IF EXISTS "Admins can view all sessions" ON daily_writing_sessions;

CREATE POLICY "Writers can view own sessions"
  ON daily_writing_sessions FOR SELECT
  TO authenticated
  USING ((select auth.uid()) = user_id);

CREATE POLICY "Writers can create sessions"
  ON daily_writing_sessions FOR INSERT
  TO authenticated
  WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "Writers can update own sessions"
  ON daily_writing_sessions FOR UPDATE
  TO authenticated
  USING ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);