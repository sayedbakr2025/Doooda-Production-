/*
  # Community Analytics – Phase 7

  ## Overview
  Adds full analytics infrastructure for the community section of the admin dashboard.

  ## New Tables
  - `community_daily_stats` — daily snapshot: active users, topics, replies, reports, engagement
    Populated by the `record_community_daily_stats()` function (can be called via cron or on-demand).

  ## New Functions
  1. `record_community_daily_stats()` — upserts today's row in community_daily_stats
  2. `get_community_health_score()` — returns a 0–100 composite health score + component breakdown
  3. `get_community_analytics_summary()` — returns last 30 days of daily stats + aggregated KPIs

  ## Security
  - community_daily_stats: admin-only read/write via RLS
  - Functions are SECURITY DEFINER with fixed search_path
*/

-- ─── community_daily_stats ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS community_daily_stats (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  stat_date date NOT NULL UNIQUE DEFAULT CURRENT_DATE,
  active_users integer NOT NULL DEFAULT 0,
  new_topics integer NOT NULL DEFAULT 0,
  new_replies integer NOT NULL DEFAULT 0,
  total_likes integer NOT NULL DEFAULT 0,
  total_reports integer NOT NULL DEFAULT 0,
  resolved_reports integer NOT NULL DEFAULT 0,
  paid_users_active integer NOT NULL DEFAULT 0,
  free_users_active integer NOT NULL DEFAULT 0,
  engagement_score float NOT NULL DEFAULT 0,
  most_active_category text DEFAULT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE community_daily_stats ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can read community daily stats"
  ON community_daily_stats FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
        AND users.admin_role IS NOT NULL
    )
  );

CREATE POLICY "Admins can insert community daily stats"
  ON community_daily_stats FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
        AND users.admin_role IS NOT NULL
    )
  );

CREATE POLICY "Admins can update community daily stats"
  ON community_daily_stats FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
        AND users.admin_role IS NOT NULL
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
        AND users.admin_role IS NOT NULL
    )
  );

CREATE INDEX IF NOT EXISTS idx_community_daily_stats_date
  ON community_daily_stats(stat_date DESC);

-- ─── record_community_daily_stats() ─────────────────────────────────────────
CREATE OR REPLACE FUNCTION record_community_daily_stats()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_date date := CURRENT_DATE;
  v_active_users integer;
  v_new_topics integer;
  v_new_replies integer;
  v_total_likes integer;
  v_total_reports integer;
  v_resolved_reports integer;
  v_paid_active integer;
  v_free_active integer;
  v_engagement float;
  v_most_active_cat text;
BEGIN
  -- Active users = users who posted topic or reply today
  SELECT COUNT(DISTINCT user_id) INTO v_active_users
  FROM (
    SELECT user_id FROM community_topics
    WHERE created_at::date = v_date AND deleted_at IS NULL
    UNION ALL
    SELECT user_id FROM community_replies
    WHERE created_at::date = v_date AND deleted_at IS NULL
  ) sub;

  SELECT COUNT(*) INTO v_new_topics
  FROM community_topics
  WHERE created_at::date = v_date AND deleted_at IS NULL;

  SELECT COUNT(*) INTO v_new_replies
  FROM community_replies
  WHERE created_at::date = v_date AND deleted_at IS NULL;

  SELECT COUNT(*) INTO v_total_likes
  FROM community_likes
  WHERE created_at::date = v_date;

  SELECT COUNT(*) INTO v_total_reports
  FROM community_reports
  WHERE created_at::date = v_date;

  SELECT COUNT(*) INTO v_resolved_reports
  FROM community_reports
  WHERE created_at::date = v_date AND resolved = true;

  -- Paid vs free active
  SELECT
    COUNT(DISTINCT CASE WHEN u.plan != 'free' THEN t.user_id END),
    COUNT(DISTINCT CASE WHEN u.plan = 'free' THEN t.user_id END)
  INTO v_paid_active, v_free_active
  FROM (
    SELECT user_id FROM community_topics
    WHERE created_at::date = v_date AND deleted_at IS NULL
    UNION ALL
    SELECT user_id FROM community_replies
    WHERE created_at::date = v_date AND deleted_at IS NULL
  ) t
  JOIN users u ON u.id = t.user_id;

  -- Engagement score: (new_topics * 5 + new_replies * 2 + total_likes) / max(active_users, 1)
  v_engagement := (v_new_topics * 5.0 + v_new_replies * 2.0 + v_total_likes) /
                  GREATEST(v_active_users, 1);

  -- Most active category today
  SELECT category INTO v_most_active_cat
  FROM community_topics
  WHERE created_at::date = v_date AND deleted_at IS NULL
  GROUP BY category
  ORDER BY COUNT(*) DESC
  LIMIT 1;

  INSERT INTO community_daily_stats (
    stat_date, active_users, new_topics, new_replies, total_likes,
    total_reports, resolved_reports, paid_users_active, free_users_active,
    engagement_score, most_active_category, updated_at
  ) VALUES (
    v_date, v_active_users, v_new_topics, v_new_replies, v_total_likes,
    v_total_reports, v_resolved_reports, v_paid_active, v_free_active,
    v_engagement, v_most_active_cat, now()
  )
  ON CONFLICT (stat_date)
  DO UPDATE SET
    active_users         = EXCLUDED.active_users,
    new_topics           = EXCLUDED.new_topics,
    new_replies          = EXCLUDED.new_replies,
    total_likes          = EXCLUDED.total_likes,
    total_reports        = EXCLUDED.total_reports,
    resolved_reports     = EXCLUDED.resolved_reports,
    paid_users_active    = EXCLUDED.paid_users_active,
    free_users_active    = EXCLUDED.free_users_active,
    engagement_score     = EXCLUDED.engagement_score,
    most_active_category = EXCLUDED.most_active_category,
    updated_at           = now();
END;
$$;

-- ─── get_community_health_score() ────────────────────────────────────────────
CREATE OR REPLACE FUNCTION get_community_health_score()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_last7 record;
  v_prev7 record;

  -- Component scores (0–100)
  v_engagement_score    float := 0;
  v_toxic_score         float := 0;
  v_growth_score        float := 0;
  v_reply_rate_score    float := 0;
  v_total_score         float := 0;

  -- Raw metrics
  v_avg_eng_recent      float;
  v_avg_eng_prev        float;
  v_toxic_ratio         float;
  v_growth_pct          float;
  v_reply_rate          float;
BEGIN
  -- Recent 7 days aggregates
  SELECT
    COALESCE(AVG(engagement_score), 0),
    COALESCE(SUM(new_topics), 0),
    COALESCE(SUM(new_replies), 0),
    COALESCE(SUM(active_users), 0),
    COALESCE(SUM(total_reports), 0),
    COALESCE(SUM(resolved_reports), 0)
  INTO v_avg_eng_recent, v_last7.topics, v_last7.replies, v_last7.users, v_last7.reports, v_last7.resolved
  FROM community_daily_stats
  WHERE stat_date > CURRENT_DATE - INTERVAL '7 days';

  -- Previous 7 days aggregates
  SELECT
    COALESCE(AVG(engagement_score), 0),
    COALESCE(SUM(active_users), 0)
  INTO v_avg_eng_prev, v_prev7.users
  FROM community_daily_stats
  WHERE stat_date > CURRENT_DATE - INTERVAL '14 days'
    AND stat_date <= CURRENT_DATE - INTERVAL '7 days';

  -- 1. Engagement score (0–100): normalize avg engagement, cap at 10 → 100
  v_engagement_score := LEAST(v_avg_eng_recent * 10.0, 100.0);

  -- 2. Toxicity score (0–100): lower report ratio = higher score
  IF v_last7.reports > 0 THEN
    v_toxic_ratio := v_last7.reports::float / GREATEST(v_last7.topics + v_last7.replies, 1)::float;
    v_toxic_score := GREATEST(100.0 - (v_toxic_ratio * 500.0), 0.0);
  ELSE
    v_toxic_score := 100.0;
  END IF;

  -- 3. Active user growth (0–100)
  IF v_prev7.users > 0 THEN
    v_growth_pct := (v_last7.users - v_prev7.users)::float / v_prev7.users::float * 100.0;
    v_growth_score := LEAST(GREATEST(50.0 + v_growth_pct * 2.0, 0.0), 100.0);
  ELSIF v_last7.users > 0 THEN
    v_growth_score := 70.0;
  ELSE
    v_growth_score := 0.0;
  END IF;

  -- 4. Reply rate score (0–100): replies per topic, target = 5
  IF v_last7.topics > 0 THEN
    v_reply_rate := v_last7.replies::float / v_last7.topics::float;
    v_reply_rate_score := LEAST(v_reply_rate * 20.0, 100.0);
  ELSE
    v_reply_rate_score := 0.0;
  END IF;

  -- Weighted composite: engagement 35%, toxicity 25%, growth 25%, reply rate 15%
  v_total_score := (v_engagement_score * 0.35)
                 + (v_toxic_score      * 0.25)
                 + (v_growth_score     * 0.25)
                 + (v_reply_rate_score * 0.15);

  RETURN jsonb_build_object(
    'total',              ROUND(v_total_score::numeric, 1),
    'engagement',         ROUND(v_engagement_score::numeric, 1),
    'toxicity',           ROUND(v_toxic_score::numeric, 1),
    'growth',             ROUND(v_growth_score::numeric, 1),
    'reply_rate',         ROUND(v_reply_rate_score::numeric, 1),
    'avg_engagement_raw', ROUND(v_avg_eng_recent::numeric, 2),
    'toxic_ratio',        ROUND(COALESCE(v_toxic_ratio, 0)::numeric, 4),
    'growth_pct',         ROUND(COALESCE(v_growth_pct, 0)::numeric, 1),
    'reply_rate_raw',     ROUND(COALESCE(v_reply_rate, 0)::numeric, 2)
  );
END;
$$;

-- ─── get_community_analytics_summary() ───────────────────────────────────────
CREATE OR REPLACE FUNCTION get_community_analytics_summary()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_daily     jsonb;
  v_kpis      jsonb;
  v_cat_dist  jsonb;
  v_health    jsonb;
  v_dau_7     float;
  v_dau_30    float;
BEGIN
  -- Daily series (last 30 days)
  SELECT jsonb_agg(
    jsonb_build_object(
      'date',          stat_date,
      'active_users',  active_users,
      'new_topics',    new_topics,
      'new_replies',   new_replies,
      'total_likes',   total_likes,
      'engagement',    ROUND(engagement_score::numeric, 2),
      'paid_active',   paid_users_active,
      'free_active',   free_users_active
    )
    ORDER BY stat_date
  )
  INTO v_daily
  FROM community_daily_stats
  WHERE stat_date > CURRENT_DATE - INTERVAL '30 days';

  -- DAU averages
  SELECT
    COALESCE(AVG(active_users), 0),
    COALESCE(AVG(active_users), 0)
  INTO v_dau_7, v_dau_30
  FROM community_daily_stats;

  SELECT AVG(active_users) INTO v_dau_7
  FROM community_daily_stats
  WHERE stat_date > CURRENT_DATE - INTERVAL '7 days';

  SELECT AVG(active_users) INTO v_dau_30
  FROM community_daily_stats
  WHERE stat_date > CURRENT_DATE - INTERVAL '30 days';

  -- Top-level KPIs
  SELECT jsonb_build_object(
    'total_topics',         (SELECT COUNT(*) FROM community_topics WHERE deleted_at IS NULL),
    'total_replies',        (SELECT COUNT(*) FROM community_replies WHERE deleted_at IS NULL),
    'total_likes',          (SELECT COUNT(*) FROM community_likes),
    'total_members',        (SELECT COUNT(DISTINCT user_id) FROM community_user_stats),
    'open_reports',         (SELECT COUNT(*) FROM community_reports WHERE resolved = false),
    'paid_members',         (SELECT COUNT(DISTINCT u.id) FROM users u JOIN community_user_stats s ON s.user_id = u.id WHERE u.plan != 'free'),
    'free_members',         (SELECT COUNT(DISTINCT u.id) FROM users u JOIN community_user_stats s ON s.user_id = u.id WHERE u.plan = 'free'),
    'dau_7',                ROUND(COALESCE(v_dau_7, 0)::numeric, 1),
    'dau_30',               ROUND(COALESCE(v_dau_30, 0)::numeric, 1),
    'conversion_rate',      CASE
                              WHEN (SELECT COUNT(*) FROM community_user_stats) > 0
                              THEN ROUND(
                                (SELECT COUNT(DISTINCT u.id) FROM users u JOIN community_user_stats s ON s.user_id = u.id WHERE u.plan != 'free')::numeric
                                / (SELECT COUNT(*) FROM community_user_stats)::numeric * 100, 1)
                              ELSE 0
                            END
  )
  INTO v_kpis;

  -- Category distribution (last 30 days)
  SELECT jsonb_agg(
    jsonb_build_object('category', category, 'count', cnt)
    ORDER BY cnt DESC
  )
  INTO v_cat_dist
  FROM (
    SELECT category, COUNT(*) AS cnt
    FROM community_topics
    WHERE deleted_at IS NULL
      AND created_at > CURRENT_DATE - INTERVAL '30 days'
    GROUP BY category
  ) sub;

  -- Health score
  v_health := get_community_health_score();

  RETURN jsonb_build_object(
    'daily',    COALESCE(v_daily, '[]'::jsonb),
    'kpis',     v_kpis,
    'category_dist', COALESCE(v_cat_dist, '[]'::jsonb),
    'health',   v_health
  );
END;
$$;

-- ─── Seed today's stats on migration run ────────────────────────────────────
SELECT record_community_daily_stats();
