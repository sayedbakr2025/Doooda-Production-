/*
  # Community Reputation System

  ## Overview
  Adds a full reputation system to the community with:
  - Points for creating topics (+5) and replies (+2)
  - Bonus points (+10) when a topic reaches 5+ replies
  - Reputation levels with display names
  - Automatic stat tracking via database triggers
  - RLS enforced with public read for displaying badges

  ## New Tables

  ### `community_user_stats`
  Tracks aggregate community activity per user:
  - `user_id` (uuid, PK, FK to auth.users)
  - `points` (integer) — total reputation points
  - `badges_count` (integer) — number of badges earned
  - `topics_created` (integer) — number of topics posted
  - `replies_count` (integer) — number of replies posted
  - `reputation_level` (text) — computed label based on points

  ## Scoring Rules
  - +5 points per new topic created
  - +2 points per new reply created
  - +10 bonus when a topic reaches exactly 5 replies (one-time)

  ## Reputation Levels
  - 0–19:    Beginner Writer
  - 20–49:   Emerging Writer
  - 50–99:   Active Contributor
  - 100–199: Community Pillar
  - 200+:    Master Storyteller

  ## Security
  - Public SELECT: any authenticated user can read stats (needed for badge display)
  - Only triggers / service role can write (no direct user writes)
*/

CREATE TABLE IF NOT EXISTS community_user_stats (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  points integer NOT NULL DEFAULT 0,
  badges_count integer NOT NULL DEFAULT 0,
  topics_created integer NOT NULL DEFAULT 0,
  replies_count integer NOT NULL DEFAULT 0,
  reputation_level text NOT NULL DEFAULT 'Beginner Writer',
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE community_user_stats ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone authenticated can read community stats"
  ON community_user_stats FOR SELECT
  TO authenticated
  USING (true);

CREATE OR REPLACE FUNCTION compute_reputation_level(pts integer)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public
AS $$
BEGIN
  IF pts >= 200 THEN RETURN 'Master Storyteller';
  ELSIF pts >= 100 THEN RETURN 'Community Pillar';
  ELSIF pts >= 50 THEN RETURN 'Active Contributor';
  ELSIF pts >= 20 THEN RETURN 'Emerging Writer';
  ELSE RETURN 'Beginner Writer';
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION upsert_community_stats(
  target_user_id uuid,
  delta_points integer DEFAULT 0,
  delta_topics integer DEFAULT 0,
  delta_replies integer DEFAULT 0,
  delta_badges integer DEFAULT 0
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO community_user_stats (user_id, points, topics_created, replies_count, badges_count, reputation_level)
  VALUES (
    target_user_id,
    GREATEST(0, delta_points),
    GREATEST(0, delta_topics),
    GREATEST(0, delta_replies),
    GREATEST(0, delta_badges),
    compute_reputation_level(GREATEST(0, delta_points))
  )
  ON CONFLICT (user_id) DO UPDATE SET
    points         = GREATEST(0, community_user_stats.points + delta_points),
    topics_created = GREATEST(0, community_user_stats.topics_created + delta_topics),
    replies_count  = GREATEST(0, community_user_stats.replies_count + delta_replies),
    badges_count   = GREATEST(0, community_user_stats.badges_count + delta_badges),
    reputation_level = compute_reputation_level(GREATEST(0, community_user_stats.points + delta_points)),
    updated_at     = now();
END;
$$;

CREATE OR REPLACE FUNCTION trg_fn_community_topic_created()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM upsert_community_stats(NEW.user_id, 5, 1, 0, 0);
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION trg_fn_community_reply_created()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  topic_owner uuid;
  new_reply_count integer;
BEGIN
  PERFORM upsert_community_stats(NEW.user_id, 2, 0, 1, 0);

  SELECT user_id, replies_count
  INTO topic_owner, new_reply_count
  FROM community_topics
  WHERE id = NEW.topic_id;

  IF new_reply_count = 5 AND topic_owner IS NOT NULL THEN
    PERFORM upsert_community_stats(topic_owner, 10, 0, 0, 1);
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION trg_fn_community_topic_soft_deleted()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF OLD.deleted_at IS NULL AND NEW.deleted_at IS NOT NULL THEN
    PERFORM upsert_community_stats(OLD.user_id, -5, -1, 0, 0);
  END IF;
  IF OLD.deleted_at IS NOT NULL AND NEW.deleted_at IS NULL THEN
    PERFORM upsert_community_stats(OLD.user_id, 5, 1, 0, 0);
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION trg_fn_community_reply_soft_deleted()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF OLD.deleted_at IS NULL AND NEW.deleted_at IS NOT NULL THEN
    PERFORM upsert_community_stats(OLD.user_id, -2, 0, -1, 0);
  END IF;
  IF OLD.deleted_at IS NOT NULL AND NEW.deleted_at IS NULL THEN
    PERFORM upsert_community_stats(OLD.user_id, 2, 0, 1, 0);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_community_topic_created ON community_topics;
CREATE TRIGGER trg_community_topic_created
  AFTER INSERT ON community_topics
  FOR EACH ROW
  WHEN (NEW.deleted_at IS NULL)
  EXECUTE FUNCTION trg_fn_community_topic_created();

DROP TRIGGER IF EXISTS trg_community_reply_created ON community_replies;
CREATE TRIGGER trg_community_reply_created
  AFTER INSERT ON community_replies
  FOR EACH ROW
  WHEN (NEW.deleted_at IS NULL)
  EXECUTE FUNCTION trg_fn_community_reply_created();

DROP TRIGGER IF EXISTS trg_community_topic_soft_delete ON community_topics;
CREATE TRIGGER trg_community_topic_soft_delete
  AFTER UPDATE OF deleted_at ON community_topics
  FOR EACH ROW
  EXECUTE FUNCTION trg_fn_community_topic_soft_deleted();

DROP TRIGGER IF EXISTS trg_community_reply_soft_delete ON community_replies;
CREATE TRIGGER trg_community_reply_soft_delete
  AFTER UPDATE OF deleted_at ON community_replies
  FOR EACH ROW
  EXECUTE FUNCTION trg_fn_community_reply_soft_deleted();

CREATE INDEX IF NOT EXISTS idx_community_user_stats_points ON community_user_stats(points DESC);

INSERT INTO community_user_stats (user_id, points, topics_created, replies_count, reputation_level)
SELECT
  t.user_id,
  (COUNT(DISTINCT t.id) * 5)::integer + (COALESCE(rc.cnt, 0) * 2)::integer AS points,
  COUNT(DISTINCT t.id)::integer AS topics_created,
  COALESCE(rc.cnt, 0)::integer AS replies_count,
  compute_reputation_level(((COUNT(DISTINCT t.id) * 5) + (COALESCE(rc.cnt, 0) * 2))::integer)
FROM community_topics t
LEFT JOIN (
  SELECT user_id, COUNT(*) AS cnt FROM community_replies WHERE deleted_at IS NULL GROUP BY user_id
) rc ON rc.user_id = t.user_id
WHERE t.deleted_at IS NULL
GROUP BY t.user_id, rc.cnt
ON CONFLICT (user_id) DO UPDATE SET
  points         = EXCLUDED.points,
  topics_created = EXCLUDED.topics_created,
  replies_count  = EXCLUDED.replies_count,
  reputation_level = EXCLUDED.reputation_level,
  updated_at     = now();
