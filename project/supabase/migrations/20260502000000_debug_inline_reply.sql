-- Debug version with more logging
CREATE OR REPLACE FUNCTION public.create_reply_notification(
  p_comment_id uuid,
  p_reply_author_id uuid,
  p_project_id uuid,
  p_scene_id uuid,
  p_reply_author_name text,
  p_project_title text,
  p_scene_title text,
  p_cta_link text,
  p_comment_type text DEFAULT 'general',
  p_content text DEFAULT NULL,
  p_reply_id uuid DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_original_author_id uuid;
  v_comment_type text;
  v_test_query text;
BEGIN
  RAISE NOTICE '[Reply Notification] Starting: parent_id=%, reply_id=%, type=%', p_comment_id, p_reply_id, p_comment_type;
  
  IF p_comment_type = 'inline' THEN
    SELECT user_id INTO v_original_author_id
    FROM inline_comments
    WHERE id = p_comment_id;
    v_comment_type := 'inline';
    RAISE NOTICE '[Reply Notification] Inline query result: user_id=%', v_original_author_id;
  ELSE
    SELECT user_id INTO v_original_author_id
    FROM comments
    WHERE id = p_comment_id;
    v_comment_type := 'general';
    RAISE NOTICE '[Reply Notification] General query result: user_id=%', v_original_author_id;
  END IF;

  RAISE NOTICE '[Reply Notification] Author check: author=%, replier=%', v_original_author_id, p_reply_author_id;
  
  IF v_original_author_id IS NULL OR v_original_author_id = p_reply_author_id THEN
    RAISE NOTICE '[Reply Notification] Skipped: same author or no author';
    RETURN;
  END IF;

  RAISE NOTICE '[Reply Notification] Creating notification for user: %', v_original_author_id;

  INSERT INTO notifications (user_id, type, category, title, title_ar, message, message_ar, data, cta_label, cta_label_ar, cta_link)
  VALUES (
    v_original_author_id,
    'reply',
    'important',
    'Someone replied to your comment',
    'قام أحد بالرد على تعليقك',
    p_reply_author_name || ' replied to your comment in ' || COALESCE(p_scene_title, 'a scene'),
    p_reply_author_name || ' رد على تعليقك في ' || COALESCE(p_scene_title, 'مشهد'),
    jsonb_build_object(
      'comment_id', COALESCE(p_reply_id, p_comment_id),
      'scene_id', p_scene_id,
      'project_id', p_project_id,
      'project_title', COALESCE(p_project_title, ''),
      'comment_type', v_comment_type,
      'replier_name', COALESCE(p_reply_author_name, ''),
      'type', 'reply',
      'parent_comment_id', p_comment_id
    ),
    'View Reply',
    'عرض الرد',
    p_cta_link
  );
  
  RAISE NOTICE '[Reply Notification] Done!';
END;
$$;