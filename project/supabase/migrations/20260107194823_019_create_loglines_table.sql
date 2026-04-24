/*
  # Create Loglines Table

  1. New Tables
    - `loglines`
      - `id` (uuid, primary key)
      - `project_id` (uuid, foreign key to projects, unique) - one logline per project
      - `content` (text) - rich text content
      - `word_count` (integer, default 0) - calculated from content
      - `created_at` (timestamp)
      - `updated_at` (timestamp)
      - `deleted_at` (timestamp, nullable) - soft delete support

  2. Security
    - Enable RLS on `loglines` table
    - Writers can only view loglines from their own projects
    - Writers can create loglines for their own projects
    - Writers can update their own loglines
    - Writers can soft-delete their own loglines
    - Admins can view all loglines

  3. Indexes
    - Unique index on project_id (one logline per project)
    - Index on deleted_at for active logline queries

  4. Important Notes
    - Only ONE logline per project allowed
    - Content is stored as rich text (JSON or HTML)
    - Word count calculated automatically
*/

CREATE TABLE IF NOT EXISTS loglines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  content text DEFAULT '',
  word_count integer DEFAULT 0 CHECK (word_count >= 0),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  deleted_at timestamptz
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_loglines_project_id 
  ON loglines(project_id) 
  WHERE deleted_at IS NULL;

ALTER TABLE loglines ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Writers can view own loglines"
  ON loglines FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = loglines.project_id
      AND projects.user_id = auth.uid()
      AND projects.deleted_at IS NULL
    )
    AND loglines.deleted_at IS NULL
  );

CREATE POLICY "Writers can create loglines"
  ON loglines FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = loglines.project_id
      AND projects.user_id = auth.uid()
      AND projects.deleted_at IS NULL
    )
  );

CREATE POLICY "Writers can update own loglines"
  ON loglines FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = loglines.project_id
      AND projects.user_id = auth.uid()
      AND projects.deleted_at IS NULL
    )
    AND loglines.deleted_at IS NULL
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = loglines.project_id
      AND projects.user_id = auth.uid()
      AND projects.deleted_at IS NULL
    )
  );

CREATE POLICY "Writers can soft-delete own loglines"
  ON loglines FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = loglines.project_id
      AND projects.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = loglines.project_id
      AND projects.user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can view all loglines"
  ON loglines FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role = 'admin'
    )
  );

CREATE OR REPLACE FUNCTION update_logline_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER loglines_updated_at
  BEFORE UPDATE ON loglines
  FOR EACH ROW
  EXECUTE FUNCTION update_logline_timestamp();

CREATE OR REPLACE FUNCTION calculate_logline_word_count()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.content IS NOT NULL THEN
    NEW.word_count = array_length(regexp_split_to_array(trim(regexp_replace(NEW.content, '<[^>]+>', '', 'g')), '\s+'), 1);
    IF NEW.word_count IS NULL THEN
      NEW.word_count = 0;
    END IF;
  ELSE
    NEW.word_count = 0;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER loglines_calculate_word_count
  BEFORE INSERT OR UPDATE OF content ON loglines
  FOR EACH ROW
  EXECUTE FUNCTION calculate_logline_word_count();
