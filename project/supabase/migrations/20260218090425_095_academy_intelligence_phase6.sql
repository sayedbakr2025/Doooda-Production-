/*
  # Academy Intelligence - Phase 6

  ## Overview
  Adds four interconnected systems to the Academy:
  1. Skill level tracking per user (derived from completed courses/levels)
  2. Course completion scores (quality of completion, not just % done)
  3. Learning path recommendations (ordered list of suggested next courses)
  4. Weekly challenges (admin-created exercises with user submissions and leaderboard)

  ## New Tables

  ### `academy_skill_levels`
  - Tracks a user's assessed skill level per writing skill category
  - Updated automatically when courses are completed
  - `user_id`, `skill_tag`, `level` (0-100 score), `updated_at`

  ### `academy_course_scores`
  - Stores a user's final completion score for a course
  - Calculated from lesson completions + exercise submissions
  - `user_id`, `course_id`, `score` (0-100), `grade` (A/B/C/D/F), `calculated_at`

  ### `academy_learning_paths`
  - Admin-curated ordered lists of courses forming a learning path
  - `id`, `title_ar`, `title_en`, `description`, `level`, `is_active`, `order_index`

  ### `academy_learning_path_courses`
  - Junction table: which courses belong to which path, in what order
  - `path_id`, `course_id`, `position`

  ### `academy_weekly_challenges`
  - Weekly writing prompts/exercises created by admins
  - `id`, `title_ar`, `title_en`, `prompt_ar`, `prompt_en`, `skill_tags`, `starts_at`, `ends_at`, `is_active`, `tokens_reward`

  ### `academy_challenge_submissions`
  - User responses to weekly challenges
  - `id`, `challenge_id`, `user_id`, `content`, `score` (admin-set), `feedback`, `created_at`

  ## Security
  - RLS enabled on all tables
  - Users can only read/write their own data
  - Admins can manage challenges and learning paths
  - Public can read active challenges and learning paths
*/

CREATE TABLE IF NOT EXISTS academy_skill_levels (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  skill_tag text NOT NULL,
  score integer NOT NULL DEFAULT 0 CHECK (score >= 0 AND score <= 100),
  updated_at timestamptz DEFAULT now(),
  UNIQUE (user_id, skill_tag)
);

ALTER TABLE academy_skill_levels ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own skill levels"
  ON academy_skill_levels FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own skill levels"
  ON academy_skill_levels FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own skill levels"
  ON academy_skill_levels FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can read all skill levels"
  ON academy_skill_levels FOR SELECT
  TO authenticated
  USING ((SELECT role FROM users WHERE id = auth.uid()) = 'admin');


CREATE TABLE IF NOT EXISTS academy_course_scores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  course_id uuid NOT NULL REFERENCES academy_courses(id) ON DELETE CASCADE,
  score integer NOT NULL DEFAULT 0 CHECK (score >= 0 AND score <= 100),
  grade text NOT NULL DEFAULT 'F' CHECK (grade IN ('A', 'B', 'C', 'D', 'F')),
  lessons_completed integer NOT NULL DEFAULT 0,
  lessons_total integer NOT NULL DEFAULT 0,
  exercises_submitted integer NOT NULL DEFAULT 0,
  calculated_at timestamptz DEFAULT now(),
  UNIQUE (user_id, course_id)
);

ALTER TABLE academy_course_scores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own course scores"
  ON academy_course_scores FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own course scores"
  ON academy_course_scores FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own course scores"
  ON academy_course_scores FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can read all course scores"
  ON academy_course_scores FOR SELECT
  TO authenticated
  USING ((SELECT role FROM users WHERE id = auth.uid()) = 'admin');


CREATE TABLE IF NOT EXISTS academy_learning_paths (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title_ar text NOT NULL DEFAULT '',
  title_en text NOT NULL DEFAULT '',
  description_ar text NOT NULL DEFAULT '',
  description_en text NOT NULL DEFAULT '',
  target_level text NOT NULL DEFAULT 'beginner' CHECK (target_level IN ('beginner', 'intermediate', 'advanced')),
  skill_tags text[] NOT NULL DEFAULT '{}',
  is_active boolean NOT NULL DEFAULT true,
  order_index integer NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE academy_learning_paths ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read active learning paths"
  ON academy_learning_paths FOR SELECT
  USING (is_active = true);

CREATE POLICY "Admins can insert learning paths"
  ON academy_learning_paths FOR INSERT
  TO authenticated
  WITH CHECK ((SELECT role FROM users WHERE id = auth.uid()) = 'admin');

CREATE POLICY "Admins can update learning paths"
  ON academy_learning_paths FOR UPDATE
  TO authenticated
  USING ((SELECT role FROM users WHERE id = auth.uid()) = 'admin')
  WITH CHECK ((SELECT role FROM users WHERE id = auth.uid()) = 'admin');

CREATE POLICY "Admins can delete learning paths"
  ON academy_learning_paths FOR DELETE
  TO authenticated
  USING ((SELECT role FROM users WHERE id = auth.uid()) = 'admin');


CREATE TABLE IF NOT EXISTS academy_learning_path_courses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  path_id uuid NOT NULL REFERENCES academy_learning_paths(id) ON DELETE CASCADE,
  course_id uuid NOT NULL REFERENCES academy_courses(id) ON DELETE CASCADE,
  position integer NOT NULL DEFAULT 0,
  UNIQUE (path_id, course_id)
);

ALTER TABLE academy_learning_path_courses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read learning path courses"
  ON academy_learning_path_courses FOR SELECT
  USING (true);

CREATE POLICY "Admins can manage learning path courses"
  ON academy_learning_path_courses FOR INSERT
  TO authenticated
  WITH CHECK ((SELECT role FROM users WHERE id = auth.uid()) = 'admin');

CREATE POLICY "Admins can update learning path courses"
  ON academy_learning_path_courses FOR UPDATE
  TO authenticated
  USING ((SELECT role FROM users WHERE id = auth.uid()) = 'admin')
  WITH CHECK ((SELECT role FROM users WHERE id = auth.uid()) = 'admin');

CREATE POLICY "Admins can delete learning path courses"
  ON academy_learning_path_courses FOR DELETE
  TO authenticated
  USING ((SELECT role FROM users WHERE id = auth.uid()) = 'admin');


CREATE TABLE IF NOT EXISTS academy_weekly_challenges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title_ar text NOT NULL DEFAULT '',
  title_en text NOT NULL DEFAULT '',
  prompt_ar text NOT NULL DEFAULT '',
  prompt_en text NOT NULL DEFAULT '',
  skill_tags text[] NOT NULL DEFAULT '{}',
  starts_at timestamptz NOT NULL DEFAULT now(),
  ends_at timestamptz NOT NULL DEFAULT (now() + interval '7 days'),
  is_active boolean NOT NULL DEFAULT true,
  tokens_reward integer NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE academy_weekly_challenges ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read active weekly challenges"
  ON academy_weekly_challenges FOR SELECT
  USING (is_active = true AND now() BETWEEN starts_at AND ends_at);

CREATE POLICY "Admins can read all weekly challenges"
  ON academy_weekly_challenges FOR SELECT
  TO authenticated
  USING ((SELECT role FROM users WHERE id = auth.uid()) = 'admin');

CREATE POLICY "Admins can insert weekly challenges"
  ON academy_weekly_challenges FOR INSERT
  TO authenticated
  WITH CHECK ((SELECT role FROM users WHERE id = auth.uid()) = 'admin');

CREATE POLICY "Admins can update weekly challenges"
  ON academy_weekly_challenges FOR UPDATE
  TO authenticated
  USING ((SELECT role FROM users WHERE id = auth.uid()) = 'admin')
  WITH CHECK ((SELECT role FROM users WHERE id = auth.uid()) = 'admin');

CREATE POLICY "Admins can delete weekly challenges"
  ON academy_weekly_challenges FOR DELETE
  TO authenticated
  USING ((SELECT role FROM users WHERE id = auth.uid()) = 'admin');


CREATE TABLE IF NOT EXISTS academy_challenge_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  challenge_id uuid NOT NULL REFERENCES academy_weekly_challenges(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content text NOT NULL DEFAULT '',
  score integer CHECK (score >= 0 AND score <= 100),
  feedback text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE (challenge_id, user_id)
);

ALTER TABLE academy_challenge_submissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own challenge submissions"
  ON academy_challenge_submissions FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own challenge submissions"
  ON academy_challenge_submissions FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own challenge submissions"
  ON academy_challenge_submissions FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can read all challenge submissions"
  ON academy_challenge_submissions FOR SELECT
  TO authenticated
  USING ((SELECT role FROM users WHERE id = auth.uid()) = 'admin');

CREATE POLICY "Admins can update challenge submissions"
  ON academy_challenge_submissions FOR UPDATE
  TO authenticated
  USING ((SELECT role FROM users WHERE id = auth.uid()) = 'admin')
  WITH CHECK ((SELECT role FROM users WHERE id = auth.uid()) = 'admin');


CREATE INDEX IF NOT EXISTS idx_academy_skill_levels_user ON academy_skill_levels(user_id);
CREATE INDEX IF NOT EXISTS idx_academy_course_scores_user ON academy_course_scores(user_id);
CREATE INDEX IF NOT EXISTS idx_academy_course_scores_course ON academy_course_scores(course_id);
CREATE INDEX IF NOT EXISTS idx_academy_learning_path_courses_path ON academy_learning_path_courses(path_id);
CREATE INDEX IF NOT EXISTS idx_academy_weekly_challenges_active ON academy_weekly_challenges(is_active, starts_at, ends_at);
CREATE INDEX IF NOT EXISTS idx_academy_challenge_submissions_challenge ON academy_challenge_submissions(challenge_id);
CREATE INDEX IF NOT EXISTS idx_academy_challenge_submissions_user ON academy_challenge_submissions(user_id);
