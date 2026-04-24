/*
  # Daily Writing Goal & Streak System

  ## New Tables

  ### `user_daily_goals`
  Stores each user's daily writing word goal.
  - `user_id` - references auth user
  - `daily_word_goal` - target words to write per day (positive integer)
  - `is_active` - whether the goal is set/active
  - `created_at` / `updated_at`

  ### `writing_streaks`
  Tracks consecutive writing days per user.
  - `user_id` - references auth user
  - `current_streak` - current consecutive days with writing activity
  - `longest_streak` - all-time longest streak
  - `last_writing_date` - the last calendar date the user wrote
  - `streak_started_at` - when the current streak started
  - `created_at` / `updated_at`

  ## Security
  - RLS enabled on both tables
  - Users can only read and write their own data
*/

-- user_daily_goals
CREATE TABLE IF NOT EXISTS user_daily_goals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  daily_word_goal integer NOT NULL CHECK (daily_word_goal > 0),
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS user_daily_goals_user_id_unique ON user_daily_goals(user_id);

ALTER TABLE user_daily_goals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own daily goal"
  ON user_daily_goals FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own daily goal"
  ON user_daily_goals FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own daily goal"
  ON user_daily_goals FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- writing_streaks
CREATE TABLE IF NOT EXISTS writing_streaks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  current_streak integer NOT NULL DEFAULT 0 CHECK (current_streak >= 0),
  longest_streak integer NOT NULL DEFAULT 0 CHECK (longest_streak >= 0),
  last_writing_date date,
  streak_started_at date,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS writing_streaks_user_id_unique ON writing_streaks(user_id);

ALTER TABLE writing_streaks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own writing streak"
  ON writing_streaks FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own writing streak"
  ON writing_streaks FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own writing streak"
  ON writing_streaks FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- daily_writing_sessions: add today_scene_words column to track words written in scenes today
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'daily_writing_sessions' AND column_name = 'today_scene_words'
  ) THEN
    ALTER TABLE daily_writing_sessions ADD COLUMN today_scene_words integer NOT NULL DEFAULT 0 CHECK (today_scene_words >= 0);
  END IF;
END $$;
