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
  v_match text[];
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

  FOR v_match IN 
    SELECT regexp_matches(p_content, '@\[([^\]]+)\]', 'g')
  LOOP
    v_mention_name := trim(v_match[1]);
    RAISE NOTICE 'Mention bracket match: %', v_mention_name;
    PERFORM public._create_single_mention_notification(
      p_comment_id, v_mention_name,
      p_project_id, p_scene_id, p_author_id, p_comment_type,
      v_project_title, v_scene_title, v_author_name, v_cta_link
    );
  END LOOP;

  FOR v_match IN 
    SELECT regexp_matches(p_content, '@([^\[\s]+)', 'g')
  LOOP
    v_mention_name := trim(v_match[1]);
    RAISE NOTICE 'Mention plain match: %', v_mention_name;
    PERFORM public._create_single_mention_notification(
      p_comment_id, v_mention_name,
      p_project_id, p_scene_id, p_author_id, p_comment_type,
      v_project_title, v_scene_title, v_author_name, v_cta_link
    );
  END LOOP;
END;
$$;

CREATE OR REPLACE FUNCTION public._create_single_mention_notification(
  p_comment_id uuid,
  p_mention_name text,
  p_project_id uuid,
  p_scene_id uuid,
  p_author_id uuid,
  p_comment_type text,
  p_project_title text,
  p_scene_title text,
  p_author_name text,
  p_cta_link text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
BEGIN
  RAISE NOTICE 'Looking for user with mention name: %', p_mention_name;

  SELECT u.id INTO v_user_id
  FROM users u
  WHERE u.id != p_author_id
    AND (
      LOWER(u.pen_name) = LOWER(p_mention_name)
      OR LOWER(u.first_name) = LOWER(p_mention_name)
      OR LOWER(u.first_name || ' ' || COALESCE(u.last_name, '')) = LOWER(p_mention_name)
      OR LOWER(split_part(u.email, '@', 1)) = LOWER(p_mention_name)
      OR LOWER(u.pen_name) LIKE LOWER(p_mention_name) || '%'
      OR LOWER(u.first_name) LIKE LOWER(p_mention_name) || '%'
    )
  LIMIT 1;

  IF v_user_id IS NULL THEN
    SELECT pc.user_id INTO v_user_id
    FROM project_collaborators pc
    JOIN users u ON u.id = pc.user_id
    WHERE pc.project_id = p_project_id
      AND pc.status = 'active'
      AND pc.user_id != p_author_id
      AND (
        LOWER(COALESCE(NULLIF(u.pen_name, ''), NULLIF(u.first_name, ''), split_part(u.email, '@', 1))) = LOWER(p_mention_name)
        OR LOWER(u.pen_name) LIKE LOWER(p_mention_name) || '%'
        OR LOWER(u.first_name || ' ' || COALESCE(u.last_name, '')) = LOWER(p_mention_name)
        OR LOWER(split_part(u.email, '@', 1)) = LOWER(p_mention_name)
      )
    LIMIT 1;
  END IF;

  IF v_user_id IS NULL THEN
    SELECT p.user_id INTO v_user_id
    FROM projects p
    JOIN users u ON u.id = p.user_id
    WHERE p.id = p_project_id
      AND p.user_id != p_author_id
      AND (
        LOWER(COALESCE(NULLIF(u.pen_name, ''), NULLIF(u.first_name, ''), split_part(u.email, '@', 1))) = LOWER(p_mention_name)
        OR LOWER(u.pen_name) LIKE LOWER(p_mention_name) || '%'
        OR LOWER(u.first_name || ' ' || COALESCE(u.last_name, '')) = LOWER(p_mention_name)
        OR LOWER(split_part(u.email, '@', 1)) = LOWER(p_mention_name)
      );
  END IF;

  IF v_user_id IS NOT NULL THEN
    RAISE NOTICE 'Found user % for mention %, inserting notification', v_user_id, p_mention_name;
    INSERT INTO notifications (user_id, type, category, title, title_ar, message, message_ar, data, cta_label, cta_label_ar, cta_link)
    VALUES (
      v_user_id,
      'mention',
      'important',
      'You were mentioned in a comment',
      'تم ذكرك في تعليق',
      COALESCE(p_author_name, 'Someone') || ' mentioned you in ' || COALESCE(p_scene_title, 'a scene'),
      COALESCE(p_author_name, 'شخص') || ' ذكرك في ' || COALESCE(p_scene_title, 'مشهد'),
      jsonb_build_object(
        'comment_id', p_comment_id,
        'scene_id', p_scene_id,
        'project_id', p_project_id,
        'project_title', COALESCE(p_project_title, ''),
        'comment_type', p_comment_type,
        'mentioner_name', COALESCE(p_author_name, ''),
        'type', 'mention'
      ),
      'View Comment',
      'عرض التعليق',
      p_cta_link
    );
  ELSE
    RAISE NOTICE 'No user found for mention name: %', p_mention_name;
  END IF;
END;
$$;