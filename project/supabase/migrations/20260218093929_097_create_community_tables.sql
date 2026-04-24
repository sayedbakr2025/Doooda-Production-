/*
  # Doooda Community – Phase 1 Foundation

  ## Overview
  Creates the community discussion forum tables:
  1. `community_topics` — discussion threads created by users
  2. `community_replies` — replies within a topic thread
  3. `community_reports` — content moderation reports from users

  ## New Tables

  ### `community_topics`
  - Main discussion threads
  - Categories: general, craft, feedback, publishing, technical
  - Support for pinning and locking by admins
  - `replies_count` maintained via trigger

  ### `community_replies`
  - Replies within topics
  - Soft edit tracking via `is_edited`
  - Locked topics block new replies at the RLS level

  ### `community_reports`
  - User-submitted content reports
  - `reported_content_type`: 'topic' or 'reply'
  - Admins can mark reports as resolved

  ## Security
  - RLS enabled on all tables
  - Anyone authenticated can read topics/replies
  - Users can only edit/delete their own content
  - Admins can pin, lock, and delete any content
  - Reports are private per user (only reporter and admins can read)
*/

CREATE TABLE IF NOT EXISTS community_topics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL DEFAULT '' CHECK (char_length(title) >= 3 AND char_length(title) <= 300),
  content text NOT NULL DEFAULT '' CHECK (char_length(content) >= 10),
  category text NOT NULL DEFAULT 'general' CHECK (category IN ('general', 'craft', 'feedback', 'publishing', 'technical')),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  is_pinned boolean NOT NULL DEFAULT false,
  is_locked boolean NOT NULL DEFAULT false,
  replies_count integer NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE community_topics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read topics"
  ON community_topics FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can create topics"
  ON community_topics FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own topics"
  ON community_topics FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id AND is_locked = false)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can update any topic"
  ON community_topics FOR UPDATE
  TO authenticated
  USING ((SELECT role FROM users WHERE id = auth.uid()) = 'admin')
  WITH CHECK ((SELECT role FROM users WHERE id = auth.uid()) = 'admin');

CREATE POLICY "Users can delete own topics"
  ON community_topics FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can delete any topic"
  ON community_topics FOR DELETE
  TO authenticated
  USING ((SELECT role FROM users WHERE id = auth.uid()) = 'admin');


CREATE TABLE IF NOT EXISTS community_replies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  topic_id uuid NOT NULL REFERENCES community_topics(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content text NOT NULL DEFAULT '' CHECK (char_length(content) >= 1),
  is_edited boolean NOT NULL DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE community_replies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read replies"
  ON community_replies FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can create replies on unlocked topics"
  ON community_replies FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM community_topics
      WHERE id = topic_id AND is_locked = false
    )
  );

CREATE POLICY "Users can update own replies"
  ON community_replies FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can update any reply"
  ON community_replies FOR UPDATE
  TO authenticated
  USING ((SELECT role FROM users WHERE id = auth.uid()) = 'admin')
  WITH CHECK ((SELECT role FROM users WHERE id = auth.uid()) = 'admin');

CREATE POLICY "Users can delete own replies"
  ON community_replies FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can delete any reply"
  ON community_replies FOR DELETE
  TO authenticated
  USING ((SELECT role FROM users WHERE id = auth.uid()) = 'admin');


CREATE TABLE IF NOT EXISTS community_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reported_content_type text NOT NULL CHECK (reported_content_type IN ('topic', 'reply')),
  reported_content_id uuid NOT NULL,
  reporter_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reason text NOT NULL DEFAULT '' CHECK (char_length(reason) >= 5),
  resolved boolean NOT NULL DEFAULT false,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE community_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own reports"
  ON community_reports FOR SELECT
  TO authenticated
  USING (auth.uid() = reporter_user_id);

CREATE POLICY "Admins can read all reports"
  ON community_reports FOR SELECT
  TO authenticated
  USING ((SELECT role FROM users WHERE id = auth.uid()) = 'admin');

CREATE POLICY "Users can create reports"
  ON community_reports FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = reporter_user_id);

CREATE POLICY "Admins can update reports"
  ON community_reports FOR UPDATE
  TO authenticated
  USING ((SELECT role FROM users WHERE id = auth.uid()) = 'admin')
  WITH CHECK ((SELECT role FROM users WHERE id = auth.uid()) = 'admin');


CREATE OR REPLACE FUNCTION increment_topic_replies_count()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE community_topics
  SET replies_count = replies_count + 1,
      updated_at = now()
  WHERE id = NEW.topic_id;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION decrement_topic_replies_count()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE community_topics
  SET replies_count = GREATEST(0, replies_count - 1)
  WHERE id = OLD.topic_id;
  RETURN OLD;
END;
$$;

CREATE OR REPLACE TRIGGER trg_increment_replies
  AFTER INSERT ON community_replies
  FOR EACH ROW EXECUTE FUNCTION increment_topic_replies_count();

CREATE OR REPLACE TRIGGER trg_decrement_replies
  AFTER DELETE ON community_replies
  FOR EACH ROW EXECUTE FUNCTION decrement_topic_replies_count();


CREATE INDEX IF NOT EXISTS idx_community_topics_category ON community_topics(category);
CREATE INDEX IF NOT EXISTS idx_community_topics_user ON community_topics(user_id);
CREATE INDEX IF NOT EXISTS idx_community_topics_created ON community_topics(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_community_topics_pinned ON community_topics(is_pinned DESC, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_community_replies_topic ON community_replies(topic_id, created_at ASC);
CREATE INDEX IF NOT EXISTS idx_community_replies_user ON community_replies(user_id);
CREATE INDEX IF NOT EXISTS idx_community_reports_unresolved ON community_reports(resolved, created_at DESC);
