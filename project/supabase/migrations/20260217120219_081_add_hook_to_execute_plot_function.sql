/*
  # Update execute_plot_transaction to include hook field

  1. Changes
    - Add hook field to the SELECT query from plot_scenes
    - Add hook field to the INSERT statement for scenes table
  
  2. Purpose
    - When executing a plot, the hook from each scene should be transferred
    - This allows writers to see the hook as a reference in the scene editor

  3. No breaking changes
    - Only adds an additional field that was already present in the table
*/

CREATE OR REPLACE FUNCTION execute_plot_transaction(
  p_plot_project_id uuid,
  p_project_id uuid,
  p_user_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_plot_executed boolean;
  v_plot_project_id_from_db uuid;
  v_project_user_id uuid;
  v_chapter record;
  v_scene record;
  v_chapter_id uuid;
  v_chapters_created integer := 0;
  v_scenes_created integer := 0;
  v_chapters_disabled integer := 0;
  v_chapter_id_map jsonb := '{}';
BEGIN
  -- Check plot project existence and get project_id from it
  SELECT id, executed INTO v_plot_project_id_from_db, v_plot_executed
  FROM plot_projects
  WHERE id = p_plot_project_id AND project_id = p_project_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Plot project not found or does not belong to this project';
  END IF;

  IF v_plot_executed THEN
    RAISE EXCEPTION 'Plot has already been executed';
  END IF;

  -- Check project ownership
  SELECT user_id INTO v_project_user_id
  FROM projects
  WHERE id = p_project_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Project not found';
  END IF;

  IF v_project_user_id != p_user_id THEN
    RAISE EXCEPTION 'Unauthorized access to project';
  END IF;

  -- Disable all existing active chapters in the project
  UPDATE chapters
  SET 
    is_active = false,
    updated_at = now()
  WHERE 
    project_id = p_project_id 
    AND is_active = true
    AND deleted_at IS NULL;
  
  GET DIAGNOSTICS v_chapters_disabled = ROW_COUNT;

  -- Create chapters from plot
  FOR v_chapter IN
    SELECT 
      order_index,
      title,
      summary
    FROM plot_chapters
    WHERE plot_project_id = p_plot_project_id
    ORDER BY order_index
  LOOP
    INSERT INTO chapters (
      project_id,
      title,
      summary,
      chapter_number,
      content,
      word_count,
      is_active
    ) VALUES (
      p_project_id,
      v_chapter.title,
      COALESCE(v_chapter.summary, ''),
      v_chapter.order_index,
      '',
      0,
      true
    )
    RETURNING id INTO v_chapter_id;

    -- Map plot chapter order_index to real chapter id
    v_chapter_id_map := jsonb_set(
      v_chapter_id_map,
      ARRAY[v_chapter.order_index::text],
      to_jsonb(v_chapter_id)
    );

    v_chapters_created := v_chapters_created + 1;
  END LOOP;

  -- Create scenes from plot
  FOR v_scene IN
    SELECT 
      pc.order_index as chapter_order_index,
      ps.order_index as scene_order_index,
      ps.title,
      ps.summary,
      ps.hook
    FROM plot_scenes ps
    JOIN plot_chapters pc ON pc.id = ps.chapter_id
    WHERE pc.plot_project_id = p_plot_project_id
    ORDER BY pc.order_index, ps.order_index
  LOOP
    -- Get the real chapter id from the map
    v_chapter_id := (v_chapter_id_map->>v_scene.chapter_order_index::text)::uuid;

    IF v_chapter_id IS NULL THEN
      CONTINUE;
    END IF;

    INSERT INTO scenes (
      chapter_id,
      title,
      summary,
      hook,
      position,
      content,
      word_count
    ) VALUES (
      v_chapter_id,
      v_scene.title,
      COALESCE(v_scene.summary, ''),
      v_scene.hook,
      v_scene.scene_order_index,
      '',
      0
    );

    v_scenes_created := v_scenes_created + 1;
  END LOOP;

  -- Mark plot as executed
  UPDATE plot_projects
  SET 
    executed = true,
    updated_at = now()
  WHERE id = p_plot_project_id;

  -- Return success result
  RETURN jsonb_build_object(
    'success', true,
    'chapters_created', v_chapters_created,
    'scenes_created', v_scenes_created,
    'chapters_disabled', v_chapters_disabled
  );

EXCEPTION WHEN OTHERS THEN
  RAISE;
END;
$$;