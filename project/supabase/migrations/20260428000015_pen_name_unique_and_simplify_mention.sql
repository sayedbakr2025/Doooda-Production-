ALTER TABLE public.users ADD CONSTRAINT users_pen_name_unique UNIQUE (pen_name);

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
  RAISE NOTICE 'Looking for user with pen_name: %', p_mention_name;

  SELECT u.id INTO v_user_id
  FROM users u
  WHERE u.id != p_author_id
    AND LOWER(u.pen_name) = LOWER(p_mention_name)
  LIMIT 1;

  IF v_user_id IS NULL THEN
    SELECT pc.user_id INTO v_user_id
    FROM project_collaborators pc
    JOIN users u ON u.id = pc.user_id
    WHERE pc.project_id = p_project_id
      AND pc.status = 'active'
      AND pc.user_id != p_author_id
      AND LOWER(u.pen_name) = LOWER(p_mention_name)
    LIMIT 1;
  END IF;

  IF v_user_id IS NULL THEN
    SELECT p.user_id INTO v_user_id
    FROM projects p
    JOIN users u ON u.id = p.user_id
    WHERE p.id = p_project_id
      AND p.user_id != p_author_id
      AND LOWER(u.pen_name) = LOWER(p_mention_name);
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
    RAISE NOTICE 'No user found with pen_name: %', p_mention_name;
  END IF;
END;
$$;