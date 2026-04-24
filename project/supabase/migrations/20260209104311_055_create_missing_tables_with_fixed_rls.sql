/*
  # Create Missing Tables with Fixed RLS Policies

  1. Problem
    - Tables tasks, characters, daily_writing_sessions don't exist
    - Original migrations have recursive RLS policies

  2. Solution
    - Create all three tables
    - Use is_admin() function instead of subqueries
    - Simplify INSERT policies to avoid recursion

  3. Tables Created
    - tasks (to-do list items)
    - characters (character profiles)
    - daily_writing_sessions (writing progress tracking)

  4. Security
    - All tables have RLS enabled
    - Writers can only access their own data
    - Admins can view all data via is_admin()
    - INSERT policies validate user_id only (no subqueries)
*/

-- Create tasks table
CREATE TABLE IF NOT EXISTS tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  chapter_number integer CHECK (chapter_number > 0),
  scene_number integer CHECK (scene_number > 0),
  context_type text NOT NULL CHECK (context_type IN ('logline', 'chapter_summary', 'scene_summary', 'scene_content')),
  description text NOT NULL CHECK (length(description) > 0),
  completed boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  deleted_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_tasks_user_project ON tasks(user_id, project_id, deleted_at);
CREATE INDEX IF NOT EXISTS idx_tasks_project_created ON tasks(project_id, created_at);
CREATE INDEX IF NOT EXISTS idx_tasks_completed ON tasks(completed);

ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Writers can view own tasks"
  ON tasks FOR SELECT
  TO authenticated
  USING (user_id = auth.uid() AND deleted_at IS NULL);

CREATE POLICY "Writers can create tasks"
  ON tasks FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Writers can update own tasks"
  ON tasks FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid() AND deleted_at IS NULL)
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Writers can soft-delete own tasks"
  ON tasks FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Admins can view all tasks"
  ON tasks FOR SELECT
  TO authenticated
  USING (is_admin());

-- Create characters table
CREATE TABLE IF NOT EXISTS characters (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  name text NOT NULL CHECK (length(name) > 0),
  age text,
  gender text,
  clothing_style text,
  speech_style text,
  psychological_issue text,
  likes text,
  dislikes text,
  fears text,
  childhood_trauma text,
  trauma_impact_adulthood text,
  education text,
  job text,
  work_relationships text,
  residence text,
  neighbor_relationships text,
  life_goal text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  deleted_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_characters_user_project ON characters(user_id, project_id, deleted_at);
CREATE INDEX IF NOT EXISTS idx_characters_project_name ON characters(project_id, name);

ALTER TABLE characters ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Writers can view own characters"
  ON characters FOR SELECT
  TO authenticated
  USING (user_id = auth.uid() AND deleted_at IS NULL);

CREATE POLICY "Writers can create characters"
  ON characters FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Writers can update own characters"
  ON characters FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid() AND deleted_at IS NULL)
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Writers can soft-delete own characters"
  ON characters FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Admins can view all characters"
  ON characters FOR SELECT
  TO authenticated
  USING (is_admin());

-- Create daily_writing_sessions table
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
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Writers can update own sessions"
  ON daily_writing_sessions FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Admins can view all sessions"
  ON daily_writing_sessions FOR SELECT
  TO authenticated
  USING (is_admin());

-- Create update triggers
CREATE OR REPLACE FUNCTION update_task_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tasks_updated_at
  BEFORE UPDATE ON tasks
  FOR EACH ROW
  EXECUTE FUNCTION update_task_timestamp();

CREATE OR REPLACE FUNCTION update_character_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER characters_updated_at
  BEFORE UPDATE ON characters
  FOR EACH ROW
  EXECUTE FUNCTION update_character_timestamp();

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

-- Goal checking trigger
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
