/*
  # Create Scenes (Subchapters) Table

  1. New Tables
    - `scenes`
      - `id` (uuid, primary key)
      - `chapter_id` (uuid, foreign key to chapters)
      - `position` (integer) - ordering within chapter (replaces chapter_number approach)
      - `title` (text, required) - scene/subchapter title
      - `summary` (text) - scene/subchapter summary
      - `content` (text) - the full written content (rich text)
      - `word_count` (integer, default 0) - calculated from content
      - `completed` (boolean, default false) - marks scene as finished
      - `created_at` (timestamp)
      - `updated_at` (timestamp)
      - `deleted_at` (timestamp, nullable) - soft delete support

  2. Security
    - Enable RLS on `scenes` table
    - Writers can only view scenes from their own chapters
    - Writers can create scenes in their own chapters
    - Writers can update their own scenes
    - Writers can soft-delete their own scenes
    - Admins can view all scenes

  3. Indexes
    - Index on chapter_id for fast scene listing
    - Composite index on (chapter_id, position) for ordering
    - Unique constraint on (chapter_id, position) where deleted_at IS NULL

  4. Important Notes
    - Terminology: "Scene" for novels/stories, "Subchapter" for books (UI handles this)
    - Position determines order (allows flexible reordering)
    - Completed scenes contribute to chapter progress
    - Word count updates chapter progress automatically
*/

CREATE TABLE IF NOT EXISTS scenes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  chapter_id uuid NOT NULL REFERENCES chapters(id) ON DELETE CASCADE,
  position integer NOT NULL CHECK (position > 0),
  title text NOT NULL,
  summary text DEFAULT '',
  content text DEFAULT '',
  word_count integer DEFAULT 0 CHECK (word_count >= 0),
  completed boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  deleted_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_scenes_chapter_id ON scenes(chapter_id);
CREATE INDEX IF NOT EXISTS idx_scenes_chapter_position ON scenes(chapter_id, position);
CREATE UNIQUE INDEX IF NOT EXISTS idx_scenes_unique_position 
  ON scenes(chapter_id, position) 
  WHERE deleted_at IS NULL;

ALTER TABLE scenes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Writers can view own scenes"
  ON scenes FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM chapters
      JOIN projects ON projects.id = chapters.project_id
      WHERE chapters.id = scenes.chapter_id
      AND projects.user_id = auth.uid()
      AND projects.deleted_at IS NULL
      AND chapters.deleted_at IS NULL
    )
    AND scenes.deleted_at IS NULL
  );

CREATE POLICY "Writers can create scenes"
  ON scenes FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM chapters
      JOIN projects ON projects.id = chapters.project_id
      WHERE chapters.id = scenes.chapter_id
      AND projects.user_id = auth.uid()
      AND projects.deleted_at IS NULL
      AND chapters.deleted_at IS NULL
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
      AND projects.user_id = auth.uid()
      AND projects.deleted_at IS NULL
      AND chapters.deleted_at IS NULL
    )
    AND scenes.deleted_at IS NULL
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM chapters
      JOIN projects ON projects.id = chapters.project_id
      WHERE chapters.id = scenes.chapter_id
      AND projects.user_id = auth.uid()
      AND projects.deleted_at IS NULL
      AND chapters.deleted_at IS NULL
    )
  );

CREATE POLICY "Writers can soft-delete own scenes"
  ON scenes FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM chapters
      JOIN projects ON projects.id = chapters.project_id
      WHERE chapters.id = scenes.chapter_id
      AND projects.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM chapters
      JOIN projects ON projects.id = chapters.project_id
      WHERE chapters.id = scenes.chapter_id
      AND projects.user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can view all scenes"
  ON scenes FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role = 'admin'
    )
  );

CREATE OR REPLACE FUNCTION update_scene_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER scenes_updated_at
  BEFORE UPDATE ON scenes
  FOR EACH ROW
  EXECUTE FUNCTION update_scene_timestamp();

CREATE OR REPLACE FUNCTION calculate_scene_word_count()
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

CREATE TRIGGER scenes_calculate_word_count
  BEFORE INSERT OR UPDATE OF content ON scenes
  FOR EACH ROW
  EXECUTE FUNCTION calculate_scene_word_count();

CREATE OR REPLACE FUNCTION update_chapter_progress_from_scenes()
RETURNS TRIGGER AS $$
DECLARE
  total_scenes integer;
  completed_scenes integer;
  new_progress integer;
  total_scene_words integer;
BEGIN
  SELECT 
    COUNT(*) FILTER (WHERE deleted_at IS NULL),
    COUNT(*) FILTER (WHERE completed = true AND deleted_at IS NULL),
    COALESCE(SUM(word_count) FILTER (WHERE deleted_at IS NULL), 0)
  INTO total_scenes, completed_scenes, total_scene_words
  FROM scenes
  WHERE chapter_id = COALESCE(NEW.chapter_id, OLD.chapter_id);

  IF total_scenes > 0 THEN
    new_progress = (completed_scenes * 100 / total_scenes);
  ELSE
    new_progress = 0;
  END IF;

  UPDATE chapters
  SET 
    word_count = total_scene_words,
    progress_percentage = new_progress,
    updated_at = now()
  WHERE id = COALESCE(NEW.chapter_id, OLD.chapter_id);

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER scenes_update_chapter_progress
  AFTER INSERT OR UPDATE OR DELETE ON scenes
  FOR EACH ROW
  EXECUTE FUNCTION update_chapter_progress_from_scenes();
