-- ============================================================
-- Phase 9: Idea Comment @Mention Notifications
-- Creates idea_mention_notifications() for idea comments
-- NO modifications to existing tables or functions.
-- ============================================================

CREATE OR REPLACE FUNCTION public.create_idea_mention_notifications(
  p_comment_id uuid,
  p_content text,
  p_project_id uuid,
  p_idea_bank_id uuid,
  p_idea_card_id uuid,
  p_author_id uuid
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
  v_author_name text;
  v_cta_link text;
  v_card_title text;
  v_bank_id uuid;
BEGIN
  SELECT title INTO v_project_title FROM public.projects WHERE id = p_project_id;
  SELECT COALESCE(NULLIF(pen_name, ''), NULLIF(first_name, ''), split_part(email, '@', 1))
    INTO v_author_name FROM public.users WHERE id = p_author_id;
  SELECT title INTO v_card_title FROM public.idea_cards WHERE id = p_idea_card_id;

  v_cta_link := '/projects/' || p_project_id 
    || '?tab=ideabank&card=' || p_idea_card_id 
    || '&comment=' || p_comment_id;

  FOR v_word IN 
    SELECT (regexp_matches(p_content, '@\[([^\]]+)\]', 'g'))[1]
  LOOP
    v_mention_name := trim(v_word);

    SELECT u.id INTO v_user_id
    FROM public.users u
    WHERE u.id != p_author_id
      AND LOWER(u.pen_name) = LOWER(v_mention_name)
    LIMIT 1;

    IF v_user_id IS NULL THEN
      SELECT ibc.user_id INTO v_user_id
      FROM public.idea_bank_collaborators ibc
      JOIN public.users u ON u.id = ibc.user_id
      WHERE ibc.idea_bank_id = p_idea_bank_id
        AND ibc.status = 'active'
        AND ibc.user_id != p_author_id
        AND LOWER(u.pen_name) = LOWER(v_mention_name)
      LIMIT 1;
    END IF;

    IF v_user_id IS NULL THEN
      SELECT pc.user_id INTO v_user_id
      FROM public.project_collaborators pc
      JOIN public.users u ON u.id = pc.user_id
      WHERE pc.project_id = p_project_id
        AND pc.status = 'active'
        AND pc.user_id != p_author_id
        AND LOWER(u.pen_name) = LOWER(v_mention_name)
      LIMIT 1;
    END IF;

    IF v_user_id IS NULL THEN
      SELECT p.user_id INTO v_user_id
      FROM public.projects p
      JOIN public.users u ON u.id = p.user_id
      WHERE p.id = p_project_id
        AND p.user_id != p_author_id
        AND LOWER(u.pen_name) = LOWER(v_mention_name);
    END IF;

    IF v_user_id IS NOT NULL THEN
      INSERT INTO public.notifications (user_id, type, category, title, title_ar, message, message_ar, data, cta_label, cta_label_ar, cta_link)
      VALUES (
        v_user_id,
        'mention',
        'important',
        'You were mentioned in an idea',
        'تم ذكرك في فكرة',
        COALESCE(v_author_name, 'Someone') || ' mentioned you in idea: ' || COALESCE(v_card_title, 'Untitled'),
        COALESCE(v_author_name, 'شخص') || ' ذكرك في الفكرة: ' || COALESCE(v_card_title, 'بدون عنوان'),
        jsonb_build_object(
          'comment_id', p_comment_id,
          'idea_card_id', p_idea_card_id,
          'idea_bank_id', p_idea_bank_id,
          'project_id', p_project_id,
          'project_title', COALESCE(v_project_title, ''),
          'mentioner_name', COALESCE(v_author_name, ''),
          'type', 'idea_mention'
        ),
        'View Idea',
        'عرض الفكرة',
        v_cta_link
      );
    END IF;
  END LOOP;
END;
$$;