-- Add bilingual columns to notifications for Arabic support
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS title_ar text;
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS message_ar text;
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS cta_label_ar text;

-- Update admin_broadcast_notification to support bilingual parameters
CREATE OR REPLACE FUNCTION admin_broadcast_notification(
  p_title text,
  p_message text,
  p_category text,
  p_cta_label text DEFAULT NULL,
  p_cta_link text DEFAULT NULL,
  p_plan_target text DEFAULT NULL,
  p_user_email text DEFAULT NULL,
  p_title_ar text DEFAULT NULL,
  p_message_ar text DEFAULT NULL,
  p_cta_label_ar text DEFAULT NULL
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_count integer;
  v_user_id uuid;
BEGIN
  IF p_user_email IS NOT NULL THEN
    SELECT id INTO v_user_id FROM users WHERE email = p_user_email LIMIT 1;
    IF v_user_id IS NULL THEN
      SELECT id INTO v_user_id FROM auth.users WHERE email = p_user_email LIMIT 1;
    END IF;
    IF v_user_id IS NULL THEN
      RAISE EXCEPTION 'User not found: %', p_user_email;
    END IF;
    INSERT INTO notifications (user_id, type, title, message, category, cta_label, cta_link, title_ar, message_ar, cta_label_ar, read)
    VALUES (v_user_id, 'broadcast', p_title, p_message, p_category, p_cta_label, p_cta_link, p_title_ar, p_message_ar, p_cta_label_ar, false);
    RETURN 1;
  END IF;

  IF p_plan_target IS NOT NULL THEN
    INSERT INTO notifications (user_id, type, title, message, category, cta_label, cta_link, title_ar, message_ar, cta_label_ar, read)
    SELECT id, 'broadcast', p_title, p_message, p_category, p_cta_label, p_cta_link, p_title_ar, p_message_ar, p_cta_label_ar, false
    FROM users
    WHERE plan = p_plan_target;
    GET DIAGNOSTICS v_count = ROW_COUNT;
    RETURN v_count;
  END IF;

  INSERT INTO notifications (user_id, type, title, message, category, cta_label, cta_link, title_ar, message_ar, cta_label_ar, read)
  SELECT id, 'broadcast', p_title, p_message, p_category, p_cta_label, p_cta_link, p_title_ar, p_message_ar, p_cta_label_ar, false
  FROM users;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;