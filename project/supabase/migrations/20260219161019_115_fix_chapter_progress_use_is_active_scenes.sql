/*
  # Fix chapter progress percentage to only count active scenes

  ## Summary
  The chapter progress bar was previously calculated based on all non-deleted scenes,
  including scenes that had been disabled (is_active = false). This caused the
  progress percentage to be inaccurate.

  ## Changes
  - Updates the `update_chapter_progress_from_scenes` function to:
    - Only count scenes where `is_active = true` AND `deleted_at IS NULL` in the total
    - Only count scenes where `completed = true` AND `is_active = true` AND `deleted_at IS NULL` as completed
    - Word count is also recalculated using only active, non-deleted scenes
  - Trigger is recreated to ensure it fires on `is_active` column changes as well

  ## Effect
  Progress percentage now reflects: (completed active scenes / total active scenes) * 100
  A scene disabled by the writer is excluded from both numerator and denominator.
*/

CREATE OR REPLACE FUNCTION update_chapter_progress_from_scenes()
RETURNS TRIGGER AS $$
DECLARE
  total_scenes integer;
  completed_scenes integer;
  new_progress integer;
  total_scene_words integer;
BEGIN
  SELECT
    COUNT(*) FILTER (WHERE deleted_at IS NULL AND is_active = true),
    COUNT(*) FILTER (WHERE completed = true AND deleted_at IS NULL AND is_active = true),
    COALESCE(SUM(word_count) FILTER (WHERE deleted_at IS NULL AND is_active = true), 0)
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
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS scenes_update_chapter_progress ON scenes;

CREATE TRIGGER scenes_update_chapter_progress
AFTER INSERT OR UPDATE OR DELETE ON scenes
FOR EACH ROW EXECUTE FUNCTION update_chapter_progress_from_scenes();
