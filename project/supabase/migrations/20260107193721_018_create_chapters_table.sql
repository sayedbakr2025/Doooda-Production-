/*
  # Create Chapters Table

  1. New Tables
    - `chapters`
      - `id` (uuid, primary key)
      - `project_id` (uuid, foreign key to projects)
      - `chapter_number` (integer) - ordering within project
      - `title` (text, required) - chapter title
      - `content` (text) - the actual writing content
      - `word_count` (integer, default 0) - calculated from content
      - `created_at` (timestamp)
      - `updated_at` (timestamp)
      - `deleted_at` (timestamp, nullable) - soft delete support

  2. Security
    - Enable RLS on `chapters` table
    - Writers can only view chapters from their own projects
    - Writers can create chapters in their own projects
    - Writers can update their own chapters
    - Writers can soft-delete their own chapters
    - Admins can view all chapters

  3. Indexes
    - Index on project_id for fast chapter listing
    - Composite index on (project_id, chapter_number) for ordering
    - Index on deleted_at for active chapter queries

  4. Constraints
    - Unique constraint on (project_id, chapter_number) where deleted_at IS NULL
    - Ensures no duplicate chapter numbers in active chapters
*/

CREATE TABLE IF NOT EXISTS chapters (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  chapter_number integer NOT NULL CHECK (chapter_number > 0),
  title text NOT NULL,
  content text DEFAULT '',
  word_count integer DEFAULT 0 CHECK (word_count >= 0),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  deleted_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_chapters_project_id ON chapters(project_id);
CREATE INDEX IF NOT EXISTS idx_chapters_project_number ON chapters(project_id, chapter_number);
CREATE UNIQUE INDEX IF NOT EXISTS idx_chapters_unique_number 
  ON chapters(project_id, chapter_number) 
  WHERE deleted_at IS NULL;

ALTER TABLE chapters ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Writers can view own chapters"
  ON chapters FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = chapters.project_id
      AND projects.user_id = auth.uid()
      AND projects.deleted_at IS NULL
    )
    AND chapters.deleted_at IS NULL
  );

CREATE POLICY "Writers can create chapters"
  ON chapters FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = chapters.project_id
      AND projects.user_id = auth.uid()
      AND projects.deleted_at IS NULL
    )
  );

CREATE POLICY "Writers can update own chapters"
  ON chapters FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = chapters.project_id
      AND projects.user_id = auth.uid()
      AND projects.deleted_at IS NULL
    )
    AND chapters.deleted_at IS NULL
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = chapters.project_id
      AND projects.user_id = auth.uid()
      AND projects.deleted_at IS NULL
    )
  );

CREATE POLICY "Writers can soft-delete own chapters"
  ON chapters FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = chapters.project_id
      AND projects.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = chapters.project_id
      AND projects.user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can view all chapters"
  ON chapters FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role = 'admin'
    )
  );

CREATE OR REPLACE FUNCTION update_chapter_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER chapters_updated_at
  BEFORE UPDATE ON chapters
  FOR EACH ROW
  EXECUTE FUNCTION update_chapter_timestamp();

CREATE OR REPLACE FUNCTION calculate_chapter_word_count()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.content IS NOT NULL THEN
    NEW.word_count = array_length(regexp_split_to_array(trim(NEW.content), '\s+'), 1);
    IF NEW.word_count IS NULL THEN
      NEW.word_count = 0;
    END IF;
  ELSE
    NEW.word_count = 0;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER chapters_calculate_word_count
  BEFORE INSERT OR UPDATE OF content ON chapters
  FOR EACH ROW
  EXECUTE FUNCTION calculate_chapter_word_count();

CREATE OR REPLACE FUNCTION update_project_word_count()
RETURNS TRIGGER AS $$
DECLARE
  total_words integer;
  new_progress integer;
  target_words integer;
BEGIN
  SELECT COALESCE(SUM(word_count), 0) INTO total_words
  FROM chapters
  WHERE project_id = COALESCE(NEW.project_id, OLD.project_id)
  AND deleted_at IS NULL;

  SELECT target_word_count INTO target_words
  FROM projects
  WHERE id = COALESCE(NEW.project_id, OLD.project_id);

  IF target_words IS NOT NULL AND target_words > 0 THEN
    new_progress = LEAST(100, (total_words * 100 / target_words));
  ELSE
    new_progress = 0;
  END IF;

  UPDATE projects
  SET 
    current_word_count = total_words,
    progress_percentage = new_progress,
    updated_at = now()
  WHERE id = COALESCE(NEW.project_id, OLD.project_id);

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER chapters_update_project_word_count
  AFTER INSERT OR UPDATE OR DELETE ON chapters
  FOR EACH ROW
  EXECUTE FUNCTION update_project_word_count();
