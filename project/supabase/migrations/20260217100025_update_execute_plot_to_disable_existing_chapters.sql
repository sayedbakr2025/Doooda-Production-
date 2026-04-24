/*
  # Update execute_plot_transaction to disable existing chapters

  1. Changes
    - Disable all existing active chapters before creating new ones
    - Fix order_index vs chapter_number mapping issue
    - Copy summaries from plot_chapters and plot_scenes to new chapters/scenes
  
  2. Logic
    - Set is_active = false for all existing chapters in the project
    - Create new chapters with chapter_number = order_index from plot
    - Create new scenes with proper chapter mapping
    - Mark plot as executed
  
  3. Security
    - Maintains SECURITY DEFINER
    - Validates ownership before any changes
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
  v_plot_user_id uuid;
  v_project_user_id uuid;
  v_chapter record;
  v_scene record;
  v_chapter_id uuid;
  v_chapters_created integer := 0;
  v_scenes_created integer := 0;
  v_chapters_disabled integer := 0;
  v_chapter_id_map jsonb := '{}';
BEGIN
  -- Check plot project ownership and executed status
  SELECT executed, user_id INTO v_plot_executed, v_plot_user_id
  FROM plot_projects
  WHERE id = p_plot_project_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Plot project not found';
  END IF;

  IF v_plot_user_id != p_user_id THEN
    RAISE EXCEPTION 'Unauthorized access to plot project';
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
      ps.summary
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
      order_index,
      content,
      word_count
    ) VALUES (
      v_chapter_id,
      v_scene.title,
      COALESCE(v_scene.summary, ''),
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