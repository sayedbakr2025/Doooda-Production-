/*
  # Fix Function Security - Immutable Search Paths
  
  1. Changes
    - Set explicit search_path for all functions
    - Prevents search_path injection attacks
  
  2. Security
    - Makes functions more secure
    - Prevents potential security vulnerabilities
*/

-- Fix search paths for all trigger functions
ALTER FUNCTION update_character_timestamp() SET search_path = public, pg_temp;
ALTER FUNCTION update_project_progress_from_chapters() SET search_path = public, pg_temp;
ALTER FUNCTION update_chapter_progress_from_scenes() SET search_path = public, pg_temp;
ALTER FUNCTION update_session_timestamp() SET search_path = public, pg_temp;
ALTER FUNCTION check_goal_reached() SET search_path = public, pg_temp;
ALTER FUNCTION update_task_timestamp() SET search_path = public, pg_temp;
ALTER FUNCTION calculate_chapter_word_count() SET search_path = public, pg_temp;
ALTER FUNCTION update_project_timestamp() SET search_path = public, pg_temp;
ALTER FUNCTION update_chapter_timestamp() SET search_path = public, pg_temp;
ALTER FUNCTION update_project_word_count() SET search_path = public, pg_temp;
ALTER FUNCTION update_logline_timestamp() SET search_path = public, pg_temp;
ALTER FUNCTION calculate_logline_word_count() SET search_path = public, pg_temp;
ALTER FUNCTION update_scene_timestamp() SET search_path = public, pg_temp;
ALTER FUNCTION calculate_scene_word_count() SET search_path = public, pg_temp;