/*
  # Community Moderation – Phase 2

  ## Overview
  Extends the community system with:
  1. Soft-delete on topics and replies (deleted_at column)
  2. User moderation: warnings and account freeze from admin
  3. Admin notifications for new reports
  4. Enhanced community_reports with admin action tracking

  ## Changes

  ### `community_topics`
  - Add `deleted_at` (timestamptz, nullable) — soft-delete marker
  - Update queries to filter out deleted content via RLS or app layer

  ### `community_replies`
  - Add `deleted_at` (timestamptz, nullable) — soft-delete marker

  ### `community_reports`
  - Add `admin_action` (text) — 'warned' | 'frozen' | 'deleted_content' | 'dismissed'
  - Add `admin_note` (text) — optional internal note from admin
  - Add `resolved_at` (timestamptz)

  ### `community_user_actions`
  New table tracking moderation actions against users:
  - `id`, `user_id` (target), `admin_id`, `action_type` ('warn' | 'freeze' | 'unfreeze')
  - `reason` (text), `created_at`

  ### `users` table
  - Add `community_frozen_at` (timestamptz) — null means not frozen
  - Add `community_warnings_count` (integer, default 0)

  ### `admin_notifications`
  New table for in-dashboard admin alerts:
  - `id`, `type` (text), `title`, `body`, `payload` (jsonb), `read` (boolean), `created_at`

  ## Security
  - RLS on all new tables
  - Admin-only access enforced via role check
*/

ALTER TABLE community_topics
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz DEFAULT NULL;

ALTER TABLE community_replies
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz DEFAULT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'community_reports' AND column_name = 'admin_action'
  ) THEN
    ALTER TABLE community_reports
      ADD COLUMN admin_action text DEFAULT NULL,
      ADD COLUMN admin_note text DEFAULT NULL,
      ADD COLUMN resolved_at timestamptz DEFAULT NULL;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'community_frozen_at'
  ) THEN
    ALTER TABLE users
      ADD COLUMN community_frozen_at timestamptz DEFAULT NULL,
      ADD COLUMN community_warnings_count integer DEFAULT 0;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS community_user_actions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  admin_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  action_type text NOT NULL CHECK (action_type IN ('warn', 'freeze', 'unfreeze')),
  reason text NOT NULL DEFAULT '' CHECK (char_length(reason) >= 1),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE community_user_actions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can read all user actions"
  ON community_user_actions FOR SELECT
  TO authenticated
  USING ((SELECT role FROM users WHERE id = auth.uid()) = 'admin');

CREATE POLICY "Admins can insert user actions"
  ON community_user_actions FOR INSERT
  TO authenticated
  WITH CHECK ((SELECT role FROM users WHERE id = auth.uid()) = 'admin');

CREATE TABLE IF NOT EXISTS admin_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type text NOT NULL DEFAULT 'info' CHECK (type IN ('report', 'warning', 'info', 'error')),
  title text NOT NULL DEFAULT '',
  body text NOT NULL DEFAULT '',
  payload jsonb DEFAULT '{}',
  read boolean NOT NULL DEFAULT false,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE admin_notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can read notifications"
  ON admin_notifications FOR SELECT
  TO authenticated
  USING ((SELECT role FROM users WHERE id = auth.uid()) = 'admin');

CREATE POLICY "Admins can update notifications"
  ON admin_notifications FOR UPDATE
  TO authenticated
  USING ((SELECT role FROM users WHERE id = auth.uid()) = 'admin')
  WITH CHECK ((SELECT role FROM users WHERE id = auth.uid()) = 'admin');

CREATE POLICY "Anyone authenticated can insert notifications"
  ON admin_notifications FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_community_topics_deleted ON community_topics(deleted_at) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_community_replies_deleted ON community_replies(deleted_at) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_community_user_actions_user ON community_user_actions(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_admin_notifications_unread ON admin_notifications(read, created_at DESC);

CREATE OR REPLACE FUNCTION notify_admin_on_report()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO admin_notifications (type, title, body, payload)
  VALUES (
    'report',
    'New community report',
    'A user reported ' || NEW.reported_content_type || ' content: ' || LEFT(NEW.reason, 80),
    jsonb_build_object(
      'report_id', NEW.id,
      'content_type', NEW.reported_content_type,
      'content_id', NEW.reported_content_id,
      'reason', NEW.reason
    )
  );
  RETURN NEW;
END;
$$;

CREATE OR REPLACE TRIGGER trg_notify_admin_on_report
  AFTER INSERT ON community_reports
  FOR EACH ROW EXECUTE FUNCTION notify_admin_on_report();
