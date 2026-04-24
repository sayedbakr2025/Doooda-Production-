-- Support system (tables already exist from SQL Editor, only add missing items)

-- Make project_id nullable in daily_writing_sessions
ALTER TABLE daily_writing_sessions ALTER COLUMN project_id DROP NOT NULL;

-- Fix unique index on daily_writing_sessions
DROP INDEX IF EXISTS idx_sessions_unique_day;
CREATE UNIQUE INDEX IF NOT EXISTS idx_sessions_user_date_unique
  ON daily_writing_sessions(user_id, session_date);

-- Add writing_schedule column if missing
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'projects' AND column_name = 'writing_schedule'
  ) THEN
    ALTER TABLE projects ADD COLUMN writing_schedule jsonb DEFAULT '{}'::jsonb;
  END IF;
END $$;

-- Add category and broadcast columns to notifications
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS category text DEFAULT 'system'
  CHECK (category IN ('invites', 'news', 'important', 'system'));

ALTER TABLE notifications ADD COLUMN IF NOT EXISTS cta_label text;

ALTER TABLE notifications ADD COLUMN IF NOT EXISTS cta_link text;

ALTER TABLE notifications ADD COLUMN IF NOT EXISTS plan_target text;

ALTER TABLE notifications ADD COLUMN IF NOT EXISTS title_ar text;

ALTER TABLE notifications ADD COLUMN IF NOT EXISTS message_ar text;

ALTER TABLE notifications ADD COLUMN IF NOT EXISTS cta_label_ar text;

-- Update existing notification categories
UPDATE notifications SET category = 'invites' WHERE type IN ('invitation', 'project_invite') AND category = 'system';
UPDATE notifications SET category = 'invites' WHERE type IN ('request', 'deletion_request') AND category = 'system';

-- Admin broadcast function (bilingual)
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