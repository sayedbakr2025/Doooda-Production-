/*
  # Community Phase 6 – Likes, Hot Score, Nested Replies

  ## Overview
  Adds the infrastructure for:
  1. Topic and reply likes (one per user)
  2. Hot score on topics (based on recency + reply count + likes)
  3. Nested replies at depth 2 (parent_reply_id on community_replies)
  4. "Most active writers" view from community_user_stats

  ## New Tables
  - `community_likes` — tracks who liked what (topic or reply)

  ## Modified Tables
  - `community_topics` — add `likes_count`, `hot_score`, `views_count`
  - `community_replies` — add `likes_count`, `parent_reply_id`

  ## Security
  - RLS on community_likes
*/

-- ─── community_likes ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS community_likes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content_type text NOT NULL CHECK (content_type IN ('topic', 'reply')),
  content_id uuid NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE (user_id, content_type, content_id)
);

ALTER TABLE community_likes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone authenticated can read likes"
  ON community_likes FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can insert own likes"
  ON community_likes FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own likes"
  ON community_likes FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_community_likes_content
  ON community_likes(content_type, content_id);

CREATE INDEX IF NOT EXISTS idx_community_likes_user
  ON community_likes(user_id, content_type);

-- ─── Extend community_topics ──────────────────────────────────────────────────
ALTER TABLE community_topics
  ADD COLUMN IF NOT EXISTS likes_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS hot_score float NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS views_count integer NOT NULL DEFAULT 0;

-- ─── Extend community_replies ─────────────────────────────────────────────────
ALTER TABLE community_replies
  ADD COLUMN IF NOT EXISTS likes_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS parent_reply_id uuid REFERENCES community_replies(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_community_replies_parent
  ON community_replies(parent_reply_id) WHERE parent_reply_id IS NOT NULL;

-- ─── Hot score function ───────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION recalculate_hot_score(p_topic_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_replies integer;
  v_likes   integer;
  v_age_hours float;
  v_score float;
BEGIN
  SELECT
    replies_count,
    likes_count,
    GREATEST(EXTRACT(EPOCH FROM (now() - created_at)) / 3600.0, 0.5)
  INTO v_replies, v_likes, v_age_hours
  FROM community_topics
  WHERE id = p_topic_id;

  v_score := (COALESCE(v_replies, 0) * 2.0 + COALESCE(v_likes, 0) * 3.0 + 1.0)
             / POWER(v_age_hours + 2.0, 1.2);

  UPDATE community_topics SET hot_score = v_score WHERE id = p_topic_id;
END;
$$;

-- ─── Trigger: hot score on reply ─────────────────────────────────────────────
CREATE OR REPLACE FUNCTION trg_update_hot_score_on_reply()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    PERFORM recalculate_hot_score(NEW.topic_id);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_hot_score_on_reply ON community_replies;
CREATE TRIGGER trg_hot_score_on_reply
  AFTER INSERT ON community_replies
  FOR EACH ROW EXECUTE FUNCTION trg_update_hot_score_on_reply();

-- ─── Trigger: hot score on like ──────────────────────────────────────────────
CREATE OR REPLACE FUNCTION trg_update_hot_score_on_like()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_topic_id uuid;
BEGIN
  IF TG_OP = 'INSERT' AND NEW.content_type = 'topic' THEN
    UPDATE community_topics SET likes_count = likes_count + 1 WHERE id = NEW.content_id;
    PERFORM recalculate_hot_score(NEW.content_id);

  ELSIF TG_OP = 'DELETE' AND OLD.content_type = 'topic' THEN
    UPDATE community_topics SET likes_count = GREATEST(likes_count - 1, 0) WHERE id = OLD.content_id;
    PERFORM recalculate_hot_score(OLD.content_id);

  ELSIF TG_OP = 'INSERT' AND NEW.content_type = 'reply' THEN
    UPDATE community_replies SET likes_count = likes_count + 1 WHERE id = NEW.content_id;
    SELECT topic_id INTO v_topic_id FROM community_replies WHERE id = NEW.content_id;
    IF v_topic_id IS NOT NULL THEN PERFORM recalculate_hot_score(v_topic_id); END IF;

  ELSIF TG_OP = 'DELETE' AND OLD.content_type = 'reply' THEN
    UPDATE community_replies SET likes_count = GREATEST(likes_count - 1, 0) WHERE id = OLD.content_id;
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trg_hot_score_on_like ON community_likes;
CREATE TRIGGER trg_hot_score_on_like
  AFTER INSERT OR DELETE ON community_likes
  FOR EACH ROW EXECUTE FUNCTION trg_update_hot_score_on_like();

-- ─── View: most active writers ────────────────────────────────────────────────
CREATE OR REPLACE VIEW community_active_writers AS
SELECT
  s.user_id,
  COALESCE(u.pen_name, u.first_name, split_part(u.email, '@', 1)) AS display_name,
  u.email,
  s.points,
  s.topics_created,
  s.replies_count,
  s.badges_count,
  s.reputation_level
FROM community_user_stats s
JOIN users u ON u.id = s.user_id
ORDER BY s.points DESC
LIMIT 10;
