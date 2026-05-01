-- Update create_reply_notification to handle without comment_type column
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
  p_content text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_original_author_id uuid;
BEGIN
  -- Get the original comment's author (comments table doesn't have comment_type)
  SELECT user_id INTO v_original_author_id
  FROM comments
  WHERE id = p_comment_id;

  -- Don't notify if replying to own comment
  IF v_original_author_id IS NULL OR v_original_author_id = p_reply_author_id THEN
    RETURN;
  END IF;

  -- Create notification
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
      'comment_id', p_comment_id,
      'scene_id', p_scene_id,
      'project_id', p_project_id,
      'project_title', COALESCE(p_project_title, ''),
      'comment_type', 'general',
      'replier_name', COALESCE(p_reply_author_name, ''),
      'type', 'reply'
    ),
    'View Reply',
    'عرض الرد',
    p_cta_link
  );
END;
$$;
