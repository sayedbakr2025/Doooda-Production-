CREATE OR REPLACE FUNCTION public.create_mention_notifications(
  p_comment_id uuid,
  p_content text,
  p_project_id uuid,
  p_scene_id uuid,
  p_author_id uuid,
  p_comment_type text DEFAULT 'general'
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_word text;
  v_mention_name text;
  v_project_title text;
  v_scene_title text;
  v_author_name text;
  v_cta_link text;
  v_chapter_id text;
BEGIN
  SELECT title INTO v_project_title FROM projects WHERE id = p_project_id;
  SELECT title, chapter_id INTO v_scene_title, v_chapter_id FROM scenes WHERE id = p_scene_id;
  SELECT COALESCE(NULLIF(pen_name, ''), NULLIF(first_name, ''), split_part(email, '@', 1)) 
  INTO v_author_name FROM users WHERE id = p_author_id;

  v_cta_link := '/projects/' || p_project_id 
    || '/chapters/' || COALESCE(v_chapter_id, '') 
    || '/scenes/' || p_scene_id 
    || '?comments=true&comment_id=' || p_comment_id 
    || '&comment_type=' || p_comment_type;

  FOR v_word IN 
    SELECT regexp_matches(p_content, '@\[([^\]]+)\]', 'g')
  LOOP
    v_mention_name := trim(v_word);
    PERFORM public._create_single_mention_notification(
      p_comment_id, v_mention_name,
      p_project_id, p_scene_id, p_author_id, p_comment_type,
      v_project_title, v_scene_title, v_author_name, v_cta_link
    );
  END LOOP;

  FOR v_word IN 
    SELECT regexp_matches(p_content, '@([^\[\s]+)', 'g')
  LOOP
    v_mention_name := trim(v_word);
    PERFORM public._create_single_mention_notification(
      p_comment_id, v_mention_name,
      p_project_id, p_scene_id, p_author_id, p_comment_type,
      v_project_title, v_scene_title, v_author_name, v_cta_link
    );
  END LOOP;
END;
$$;