/*
  # Add Source References to Tasks Table

  1. Changes
    - Add `chapter_id` column to reference the specific chapter
    - Add `scene_id` column to reference the specific scene
    - These allow direct navigation to the note's source

  2. Important Notes
    - chapter_id and scene_id are nullable (logline notes have neither)
    - When a note is created from a chapter or scene, we store the ID
    - This enables the "Open" button in the notes section
    - IDs are more stable than numbers (which can change)
*/

DO $$
BEGIN
  -- Add chapter_id column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'tasks' AND column_name = 'chapter_id'
  ) THEN
    ALTER TABLE tasks ADD COLUMN chapter_id uuid REFERENCES chapters(id) ON DELETE SET NULL;
  END IF;

  -- Add scene_id column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'tasks' AND column_name = 'scene_id'
  ) THEN
    ALTER TABLE tasks ADD COLUMN scene_id uuid REFERENCES scenes(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_tasks_chapter_id ON tasks(chapter_id);
CREATE INDEX IF NOT EXISTS idx_tasks_scene_id ON tasks(scene_id);

COMMENT ON COLUMN tasks.chapter_id IS 'Direct reference to chapter where note was created';
COMMENT ON COLUMN tasks.scene_id IS 'Direct reference to scene where note was created';
