/*
  # Update Chapters Table - Add Summary and Position

  1. Changes to chapters table
    - Add `summary` (text) - chapter summary/description
    - Add `position` (integer) - ordering within project (replaces chapter_number for ordering)
    - Add `progress_percentage` (integer) - calculated from completed scenes
    - Keep `chapter_number` for backward compatibility but use `position` for ordering

  2. Important Notes
    - Position allows flexible reordering via drag & drop
    - Progress is now based on scene completion, not word count
    - Summary is created from context menu or manually
    - Chapter completion based on scene completion percentage

  3. Data Migration
    - Set position = chapter_number for existing chapters
    - Initialize summary as empty string
    - Initialize progress_percentage as 0
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'chapters' AND column_name = 'summary'
  ) THEN
    ALTER TABLE chapters ADD COLUMN summary text DEFAULT '';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'chapters' AND column_name = 'position'
  ) THEN
    ALTER TABLE chapters ADD COLUMN position integer;
    
    UPDATE chapters SET position = chapter_number WHERE position IS NULL;
    
    ALTER TABLE chapters ALTER COLUMN position SET NOT NULL;
    ALTER TABLE chapters ADD CONSTRAINT chapters_position_check CHECK (position > 0);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'chapters' AND column_name = 'progress_percentage'
  ) THEN
    ALTER TABLE chapters ADD COLUMN progress_percentage integer DEFAULT 0 CHECK (progress_percentage >= 0 AND progress_percentage <= 100);
  END IF;
END $$;

DROP INDEX IF EXISTS idx_chapters_project_number;
CREATE INDEX IF NOT EXISTS idx_chapters_project_position ON chapters(project_id, position);

CREATE UNIQUE INDEX IF NOT EXISTS idx_chapters_unique_position 
  ON chapters(project_id, position) 
  WHERE deleted_at IS NULL;

CREATE OR REPLACE FUNCTION update_project_progress_from_chapters()
RETURNS TRIGGER AS $$
DECLARE
  total_chapters integer;
  completed_chapters integer;
  new_progress integer;
  total_chapter_words integer;
BEGIN
  SELECT 
    COUNT(*) FILTER (WHERE deleted_at IS NULL),
    COUNT(*) FILTER (WHERE progress_percentage = 100 AND deleted_at IS NULL),
    COALESCE(SUM(word_count) FILTER (WHERE deleted_at IS NULL), 0)
  INTO total_chapters, completed_chapters, total_chapter_words
  FROM chapters
  WHERE project_id = COALESCE(NEW.project_id, OLD.project_id);

  IF total_chapters > 0 THEN
    new_progress = (completed_chapters * 100 / total_chapters);
  ELSE
    new_progress = 0;
  END IF;

  UPDATE projects
  SET 
    current_word_count = total_chapter_words,
    progress_percentage = new_progress,
    updated_at = now()
  WHERE id = COALESCE(NEW.project_id, OLD.project_id);

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS chapters_update_project_word_count ON chapters;

CREATE TRIGGER chapters_update_project_progress
  AFTER INSERT OR UPDATE OR DELETE ON chapters
  FOR EACH ROW
  EXECUTE FUNCTION update_project_progress_from_chapters();
