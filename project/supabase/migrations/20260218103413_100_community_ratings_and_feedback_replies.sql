/*
  # Community Ratings & Structured Feedback Replies

  ## Overview
  Adds a complete writing feedback system to the community:

  ## New Tables

  ### `community_ratings`
  Stores 1–5 star ratings for feedback-category topics:
  - `id` (uuid, PK)
  - `topic_id` (uuid, FK → community_topics)
  - `user_id` (uuid, FK → auth.users)
  - `score` (integer 1–5)
  - `created_at` (timestamptz)
  - UNIQUE (topic_id, user_id) — one rating per user per topic

  ### `community_feedback_replies`
  Stores structured feedback replies for feedback topics:
  - `id` (uuid, PK)
  - `reply_id` (uuid, FK → community_replies) — links to base reply
  - `topic_id` (uuid, FK → community_topics)
  - `user_id` (uuid, FK → auth.users)
  - `structure_feedback` (text) — plot/structure comments
  - `character_feedback` (text) — character comments
  - `dialogue_feedback` (text) — dialogue comments
  - `overall_rating` (integer 1–5)
  - `created_at` (timestamptz)

  ## Security
  - RLS enabled on both tables
  - Any authenticated user can read ratings and feedback
  - Users can only insert/update/delete their own records
*/

CREATE TABLE IF NOT EXISTS community_ratings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  topic_id uuid NOT NULL REFERENCES community_topics(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  score integer NOT NULL CHECK (score BETWEEN 1 AND 5),
  created_at timestamptz DEFAULT now(),
  UNIQUE (topic_id, user_id)
);

ALTER TABLE community_ratings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read ratings"
  ON community_ratings FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can insert own ratings"
  ON community_ratings FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own ratings"
  ON community_ratings FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own ratings"
  ON community_ratings FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS community_feedback_replies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reply_id uuid REFERENCES community_replies(id) ON DELETE CASCADE,
  topic_id uuid NOT NULL REFERENCES community_topics(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  structure_feedback text NOT NULL DEFAULT '',
  character_feedback text NOT NULL DEFAULT '',
  dialogue_feedback text NOT NULL DEFAULT '',
  overall_rating integer CHECK (overall_rating BETWEEN 1 AND 5),
  created_at timestamptz DEFAULT now(),
  UNIQUE (topic_id, user_id)
);

ALTER TABLE community_feedback_replies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read feedback replies"
  ON community_feedback_replies FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can insert own feedback replies"
  ON community_feedback_replies FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own feedback replies"
  ON community_feedback_replies FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own feedback replies"
  ON community_feedback_replies FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_community_ratings_topic_id ON community_ratings(topic_id);
CREATE INDEX IF NOT EXISTS idx_community_ratings_user_id ON community_ratings(user_id);
CREATE INDEX IF NOT EXISTS idx_community_feedback_replies_topic_id ON community_feedback_replies(topic_id);
CREATE INDEX IF NOT EXISTS idx_community_feedback_replies_reply_id ON community_feedback_replies(reply_id);
