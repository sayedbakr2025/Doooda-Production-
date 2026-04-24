/*
  # Fix Word Count Logic
  
  This migration enforces proper word counting rules:
  
  1. Changes to Projects Table
     - Make `target_word_count` REQUIRED (NOT NULL)
     - All projects must have a word count goal
  
  2. Word Counting Rules
     - ONLY scene content counts toward word totals
     - Chapter content, loglines, summaries, and notes do NOT count
     - Remove chapter content word counting trigger
  
  3. Updated Flow
     - Scenes calculate their own word_count from content
     - Chapters aggregate word_count from their scenes
     - Projects aggregate word_count from all chapters
     - Progress is calculated as: (current_word_count / target_word_count) * 100
  
  4. Data Safety
     - Set default target_word_count of 50000 for existing projects without one
     - This is a safe assumption for novel-length projects
  
  Important Notes:
  - This ensures consistency across web and mobile platforms
  - Word counting is deterministic and server-side only
  - No client-side word count calculations needed
*/

-- Step 1: Set default target_word_count for existing projects that don't have one
UPDATE projects 
SET target_word_count = 50000 
WHERE target_word_count IS NULL;

-- Step 2: Make target_word_count required (NOT NULL)
ALTER TABLE projects 
ALTER COLUMN target_word_count SET NOT NULL;

-- Step 3: Remove the chapter content word counting trigger
-- This trigger incorrectly counts chapter.content which should not contribute to word count
DROP TRIGGER IF EXISTS chapters_calculate_word_count ON chapters;
DROP FUNCTION IF EXISTS calculate_chapter_word_count();

-- Step 4: Update chapter word_count for existing chapters
-- Set to 0 initially, then the scenes trigger will update them correctly
UPDATE chapters 
SET word_count = 0 
WHERE deleted_at IS NULL;

-- Step 5: Recalculate all chapter word counts from scenes
-- This trigger already exists but let's make sure it runs for all chapters
DO $$
DECLARE
  chapter_record RECORD;
  total_scene_words integer;
BEGIN
  FOR chapter_record IN 
    SELECT id FROM chapters WHERE deleted_at IS NULL
  LOOP
    SELECT COALESCE(SUM(word_count), 0) INTO total_scene_words
    FROM scenes
    WHERE chapter_id = chapter_record.id
    AND deleted_at IS NULL;
    
    UPDATE chapters
    SET word_count = total_scene_words
    WHERE id = chapter_record.id;
  END LOOP;
END $$;

-- Step 6: Recalculate all project word counts
-- Force recalculation by updating all chapters
UPDATE chapters
SET updated_at = now()
WHERE deleted_at IS NULL;
