/*
  # Create Execute Plot Function with Transaction

  1. New Function
    - `execute_plot_transaction` - Atomically executes plot to project
    - Takes plot_project_id and project_id
    - Creates chapters and scenes in a single transaction
    - Updates executed flag
    - Returns success status

  2. Features
    - Full atomicity - all or nothing
    - Validates user ownership
    - Prevents duplicate execution
    - Returns chapter and scene counts

  3. Security
    - SECURITY DEFINER to bypass RLS
    - Manual ownership checks
    - Validates plot not already executed
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

  -- Create chapters
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
      order_index,
      content,
      word_count
    ) VALUES (
      p_project_id,
      v_chapter.title,
      v_chapter.summary,
      v_chapter.order_index,
      '',
      0
    )
    RETURNING id INTO v_chapter_id;

    v_chapter_id_map := jsonb_set(
      v_chapter_id_map,
      ARRAY[v_chapter.order_index::text],
      to_jsonb(v_chapter_id)
    );

    v_chapters_created := v_chapters_created + 1;
  END LOOP;

  -- Create scenes
  FOR v_scene IN
    SELECT 
      pc.order_index as chapter_order_index,
      ps.order_index,
      ps.title,
      ps.summary
    FROM plot_scenes ps
    JOIN plot_chapters pc ON pc.id = ps.plot_chapter_id
    WHERE pc.plot_project_id = p_plot_project_id
    ORDER BY pc.order_index, ps.order_index
  LOOP
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
      v_scene.summary,
      v_scene.order_index,
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
    'scenes_created', v_scenes_created
  );

EXCEPTION WHEN OTHERS THEN
  RAISE;
END;
$$;
