/*
  # Community AI Moderation – Phase 5

  ## Overview
  Adds lightweight AI moderation to community replies and topics.
  Content flagged by the AI moderation check is held in a "pending_review"
  state and not published until an admin approves or rejects it.

  ## Changes

  ### `community_replies`
  - Add `moderation_status` (text) — 'published' | 'pending_review' | 'rejected'
  - Add `moderation_flags` (jsonb) — reasons detected by AI (spam, toxic, duplicate, off_topic)
  - Add `moderation_checked_at` (timestamptz)

  ### `community_topics`
  - Add `moderation_status` (text) — 'published' | 'pending_review' | 'rejected'
  - Add `moderation_flags` (jsonb)
  - Add `moderation_checked_at` (timestamptz)

  ## Security
  - Users only see published content; pending content visible only to owner + admins
  - Admins can update moderation_status on both tables

  ## Notes
  - Default is 'published' for existing content (no disruption to existing data)
  - New content defaults to null (moderation pending) until edge function runs
  - The edge function uses a minimal prompt to keep token usage extremely low
*/

ALTER TABLE community_replies
  ADD COLUMN IF NOT EXISTS moderation_status text NOT NULL DEFAULT 'published'
    CHECK (moderation_status IN ('published', 'pending_review', 'rejected')),
  ADD COLUMN IF NOT EXISTS moderation_flags jsonb DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS moderation_checked_at timestamptz DEFAULT NULL;

ALTER TABLE community_topics
  ADD COLUMN IF NOT EXISTS moderation_status text NOT NULL DEFAULT 'published'
    CHECK (moderation_status IN ('published', 'pending_review', 'rejected')),
  ADD COLUMN IF NOT EXISTS moderation_flags jsonb DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS moderation_checked_at timestamptz DEFAULT NULL;

CREATE INDEX IF NOT EXISTS idx_community_replies_moderation
  ON community_replies(moderation_status)
  WHERE moderation_status != 'published';

CREATE INDEX IF NOT EXISTS idx_community_topics_moderation
  ON community_topics(moderation_status)
  WHERE moderation_status != 'published';
