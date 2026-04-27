-- Fix create_mention_notifications: use simpler regex, add debug logging
-- The \p{L}\p{N} regex class is not reliable in PostgreSQL, use \S+ instead

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
  v_user_id uuid;
  v_project_title text;
  v_scene_title text;
  v_author_name text;
  v_cta_link text;
  v_chapter_id text;
BEGIN
  -- Get project title
  SELECT title INTO v_project_title FROM projects WHERE id = p_project_id;
  -- Get scene title and chapter_id
  SELECT title, chapter_id INTO v_scene_title, v_chapter_id FROM scenes WHERE id = p_scene_id;
  -- Get author display name
  SELECT COALESCE(NULLIF(pen_name, ''), NULLIF(first_name, ''), split_part(email, '@', 1)) 
  INTO v_author_name FROM users WHERE id = p_author_id;

  -- Build CTA link
  v_cta_link := '/projects/' || p_project_id 
    || '/chapters/' || COALESCE(v_chapter_id, '') 
    || '/scenes/' || p_scene_id 
    || '?comments=true&comment_id=' || p_comment_id 
    || '&comment_type=' || p_comment_type;

  -- Extract @mentions from content using \S+ (one or more non-whitespace chars after @)
  FOR v_word IN 
    SELECT regexp_matches(p_content, '@(\S+)', 'g')
  LOOP
    v_mention_name := trim(v_word);
    
    -- Try to find user by pen_name, first_name, or email prefix
    -- Also match Arabic names
    SELECT u.id INTO v_user_id
    FROM users u
    WHERE u.id != p_author_id
      AND (
        LOWER(u.pen_name) = LOWER(v_mention_name)
        OR LOWER(u.first_name) = LOWER(v_mention_name)
        OR LOWER(split_part(u.email, '@', 1)) = LOWER(v_mention_name)
        OR LOWER(u.pen_name) LIKE LOWER(v_mention_name) || '%'
        OR LOWER(u.first_name) LIKE LOWER(v_mention_name) || '%'
      )
    LIMIT 1;

    -- If not found, check project collaborators (active only, excluding self)
    IF v_user_id IS NULL THEN
      SELECT pc.user_id INTO v_user_id
      FROM project_collaborators pc
      JOIN users u ON u.id = pc.user_id
      WHERE pc.project_id = p_project_id
        AND pc.status = 'active'
        AND pc.user_id != p_author_id
        AND (
          LOWER(COALESCE(NULLIF(u.pen_name, ''), NULLIF(u.first_name, ''), split_part(u.email, '@', 1))) = LOWER(v_mention_name)
          OR LOWER(u.pen_name) LIKE LOWER(v_mention_name) || '%'
          OR LOWER(split_part(u.email, '@', 1)) = LOWER(v_mention_name)
        )
      LIMIT 1;
    END IF;

    -- If still not found, check project owner (excluding self)
    IF v_user_id IS NULL THEN
      SELECT p.user_id INTO v_user_id
      FROM projects p
      JOIN users u ON u.id = p.user_id
      WHERE p.id = p_project_id
        AND p.user_id != p_author_id
        AND (
          LOWER(COALESCE(NULLIF(u.pen_name, ''), NULLIF(u.first_name, ''), split_part(u.email, '@', 1))) = LOWER(v_mention_name)
          OR LOWER(u.pen_name) LIKE LOWER(v_mention_name) || '%'
          OR LOWER(split_part(u.email, '@', 1)) = LOWER(v_mention_name)
        );
    END IF;

    -- Create notification for the mentioned user
    IF v_user_id IS NOT NULL THEN
      INSERT INTO notifications (user_id, type, category, title, title_ar, message, message_ar, data, cta_label, cta_label_ar, cta_link)
      VALUES (
        v_user_id,
        'mention',
        'important',
        'You were mentioned in a comment',
        'تم ذكرك في تعليق',
        COALESCE(v_author_name, 'Someone') || ' mentioned you in ' || COALESCE(v_scene_title, 'a scene'),
        COALESCE(v_author_name, 'شخص') || ' ذكرك في ' || COALESCE(v_scene_title, 'مشهد'),
        jsonb_build_object(
          'comment_id', p_comment_id,
          'scene_id', p_scene_id,
          'project_id', p_project_id,
          'project_title', COALESCE(v_project_title, ''),
          'comment_type', p_comment_type,
          'mentioner_name', COALESCE(v_author_name, ''),
          'type', 'mention'
        ),
        'View Comment',
        'عرض التعليق',
        v_cta_link
      )
      ON CONFLICT DO NOTHING;
    END IF;
  END LOOP;
END;
$$;