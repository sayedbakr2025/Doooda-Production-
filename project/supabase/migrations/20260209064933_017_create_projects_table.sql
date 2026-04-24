/*
  # Create Projects Table

  1. New Tables
    - `projects`
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key to users) - project owner
      - `title` (text, required) - project title
      - `project_type` (text, check constraint) - novel, short_story, long_story, book
      - `idea` (text, optional) - project description/idea
      - `target_word_count` (integer, optional) - target word count goal
      - `current_word_count` (integer, default 0) - calculated from chapters
      - `progress_percentage` (integer, default 0) - calculated progress
      - `last_accessed_at` (timestamp) - for "continue where you left off"
      - `created_at` (timestamp)
      - `updated_at` (timestamp)
      - `deleted_at` (timestamp, nullable) - soft delete support

  2. Security
    - Enable RLS on `projects` table
    - Writers can only view their own non-deleted projects
    - Writers can create projects (server validates limits)
    - Writers can update their own projects
    - Writers can soft-delete their own projects
    - Admins can view all projects including deleted ones

  3. Indexes
    - Index on user_id for fast project listing
    - Index on updated_at for ordering
    - Composite index on (user_id, deleted_at) for active project queries
*/

CREATE TABLE IF NOT EXISTS projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title text NOT NULL,
  project_type text NOT NULL CHECK (project_type IN ('novel', 'short_story', 'long_story', 'book')),
  idea text,
  target_word_count integer CHECK (target_word_count > 0),
  current_word_count integer DEFAULT 0 CHECK (current_word_count >= 0),
  progress_percentage integer DEFAULT 0 CHECK (progress_percentage >= 0 AND progress_percentage <= 100),
  last_accessed_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  deleted_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_projects_user_id ON projects(user_id);
CREATE INDEX IF NOT EXISTS idx_projects_updated_at ON projects(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_projects_user_active ON projects(user_id, deleted_at) WHERE deleted_at IS NULL;

ALTER TABLE projects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Writers can view own projects"
  ON projects FOR SELECT
  TO authenticated
  USING (
    auth.uid() = user_id 
    AND deleted_at IS NULL
  );

CREATE POLICY "Writers can create projects"
  ON projects FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Writers can update own projects"
  ON projects FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id AND deleted_at IS NULL)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Writers can soft-delete own projects"
  ON projects FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all projects"
  ON projects FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role = 'admin'
    )
  );

CREATE OR REPLACE FUNCTION update_project_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER projects_updated_at
  BEFORE UPDATE ON projects
  FOR EACH ROW
  EXECUTE FUNCTION update_project_timestamp();