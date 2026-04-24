/*
  # Fix progress calculations to fully exclude inactive chapters and scenes

  ## Summary
  Ensures that disabled (is_active = false) chapters and scenes are completely
  invisible to all progress and word count calculations.

  ## Changes

  ### 1. update_project_word_count trigger function
  - Previously only filtered `deleted_at IS NULL` on chapters
  - Now also filters `is_active = true` so disabled chapters do NOT
    contribute word count or affect project progress_percentage

  ### 2. update_chapter_progress_from_scenes trigger function
  - Was already filtering `is_active = true` on scenes (migration 115)
  - No change needed here

  ## Notes
  - The project-level trigger fires when a chapter row changes (including
    when is_active is toggled), so the fix below is sufficient to make
    deactivating a chapter immediately remove its contribution.
  - Re-activating a chapter will immediately restore its contribution.
*/

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
    AND deleted_at IS NULL
    AND is_active = true;

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
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
