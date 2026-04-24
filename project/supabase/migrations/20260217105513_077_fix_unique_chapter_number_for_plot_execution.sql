/*
  # Fix unique chapter number constraint for plot execution

  1. Problem
    - Current unique index prevents multiple chapters with same number
    - Plot execution disables old chapters (is_active = false) but can't create new ones with same numbers
    - Index only checks deleted_at, not is_active
  
  2. Solution
    - Drop old unique index
    - Create new unique index that only applies to active chapters
    - This allows inactive chapters with duplicate numbers
    - Only one active chapter per number per project

  3. Security
    - Maintains data integrity
    - Allows proper plot execution without conflicts
*/

-- Drop the old unique index
DROP INDEX IF EXISTS idx_chapters_unique_number;

-- Create new unique index that only applies to active, non-deleted chapters
CREATE UNIQUE INDEX idx_chapters_unique_number 
ON chapters (project_id, chapter_number) 
WHERE deleted_at IS NULL AND is_active = true;
