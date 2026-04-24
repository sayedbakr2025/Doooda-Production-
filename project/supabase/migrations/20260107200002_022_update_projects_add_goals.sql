/*
  # Update Projects Table - Add Goals and Progress Features

  1. Changes to projects table
    - Add `target_word_count` (integer, nullable) - optional project word goal
    - Add `writing_schedule` (jsonb) - days and daily word goal
      Format: { "days": [0,1,2,3,4,5,6], "dailyGoal": 1000, "enabled": true }
      Where days: 0=Sunday, 1=Monday, ..., 6=Saturday
    - Add `last_word_count` (integer, default 0) - for delta calculation

  2. Important Notes
    - target_word_count is optional (can be null)
    - writing_schedule stores which days user wants to write
    - dailyGoal applies only to scheduled days
    - last_word_count tracks previous save for delta calculation

  3. Data Migration
    - Initialize target_word_count as null
    - Initialize writing_schedule as empty object
    - Initialize last_word_count from current_word_count
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'projects' AND column_name = 'target_word_count'
  ) THEN
    ALTER TABLE projects ADD COLUMN target_word_count integer CHECK (target_word_count > 0);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'projects' AND column_name = 'writing_schedule'
  ) THEN
    ALTER TABLE projects ADD COLUMN writing_schedule jsonb DEFAULT '{}'::jsonb;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'projects' AND column_name = 'last_word_count'
  ) THEN
    ALTER TABLE projects ADD COLUMN last_word_count integer DEFAULT 0 CHECK (last_word_count >= 0);
    
    UPDATE projects SET last_word_count = COALESCE(current_word_count, 0) WHERE last_word_count = 0;
  END IF;
END $$;

COMMENT ON COLUMN projects.target_word_count IS 'Optional total word count goal for the project';
COMMENT ON COLUMN projects.writing_schedule IS 'Writing schedule: days of week and daily word goal';
COMMENT ON COLUMN projects.last_word_count IS 'Previous word count for calculating daily delta';
