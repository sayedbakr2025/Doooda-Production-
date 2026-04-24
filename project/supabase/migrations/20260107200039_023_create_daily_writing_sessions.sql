/*
  # Create Daily Writing Sessions Table

  1. New Tables
    - `daily_writing_sessions`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references users) - writer
      - `project_id` (uuid, references projects) - which project
      - `session_date` (date) - which day (in user's timezone)
      - `words_written` (integer, default 0) - total words added this day
      - `goal_reached` (boolean, default false) - whether daily goal was met
      - `goal_reached_at` (timestamptz, nullable) - when goal was first reached
      - `created_at` (timestamptz, default now())
      - `updated_at` (timestamptz, default now())

  2. Security
    - Enable RLS on `daily_writing_sessions` table
    - Writers can only view their own sessions
    - Writers can create sessions for their own projects
    - Writers can update their own sessions
    - Admins can view all sessions

  3. Indexes
    - Index on (user_id, session_date) for daily lookups
    - Index on (project_id, session_date) for project-specific lookups
    - Unique constraint on (user_id, project_id, session_date) - one session per project per day

  4. Important Notes
    - session_date is in user's timezone (date only, no time)
    - words_written tracks cumulative additions for the day (not deletions)
    - goal_reached flag prevents multiple celebrations
    - goal_reached_at captures exact moment goal was met
*/

CREATE TABLE IF NOT EXISTS daily_writing_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  session_date date NOT NULL,
  words_written integer DEFAULT 0 CHECK (words_written >= 0),
  goal_reached boolean DEFAULT false,
  goal_reached_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_sessions_user_date ON daily_writing_sessions(user_id, session_date);
CREATE INDEX IF NOT EXISTS idx_sessions_project_date ON daily_writing_sessions(project_id, session_date);
CREATE UNIQUE INDEX IF NOT EXISTS idx_sessions_unique_day 
  ON daily_writing_sessions(user_id, project_id, session_date);

ALTER TABLE daily_writing_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Writers can view own sessions"
  ON daily_writing_sessions FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Writers can create sessions"
  ON daily_writing_sessions FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = daily_writing_sessions.project_id
      AND projects.user_id = auth.uid()
      AND projects.deleted_at IS NULL
    )
  );

CREATE POLICY "Writers can update own sessions"
  ON daily_writing_sessions FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Admins can view all sessions"
  ON daily_writing_sessions FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role = 'admin'
    )
  );

CREATE OR REPLACE FUNCTION update_session_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER sessions_updated_at
  BEFORE UPDATE ON daily_writing_sessions
  FOR EACH ROW
  EXECUTE FUNCTION update_session_timestamp();

CREATE OR REPLACE FUNCTION check_goal_reached()
RETURNS TRIGGER AS $$
DECLARE
  daily_goal integer;
  schedule_enabled boolean;
  scheduled_days integer[];
  day_of_week integer;
BEGIN
  SELECT 
    (writing_schedule->>'dailyGoal')::integer,
    COALESCE((writing_schedule->>'enabled')::boolean, false),
    COALESCE(
      (SELECT array_agg(value::integer) 
       FROM jsonb_array_elements_text(writing_schedule->'days')),
      ARRAY[]::integer[]
    )
  INTO daily_goal, schedule_enabled, scheduled_days
  FROM projects
  WHERE id = NEW.project_id;

  day_of_week = EXTRACT(DOW FROM NEW.session_date)::integer;

  IF schedule_enabled 
     AND daily_goal IS NOT NULL 
     AND daily_goal > 0 
     AND day_of_week = ANY(scheduled_days)
     AND NEW.words_written >= daily_goal 
     AND NEW.goal_reached = false THEN
    NEW.goal_reached = true;
    NEW.goal_reached_at = now();
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER sessions_check_goal
  BEFORE INSERT OR UPDATE OF words_written ON daily_writing_sessions
  FOR EACH ROW
  EXECUTE FUNCTION check_goal_reached();
