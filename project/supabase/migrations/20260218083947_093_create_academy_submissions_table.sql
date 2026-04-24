/*
  # Create Academy Submissions Table

  ## Purpose
  Stores user writing submissions for exercise-type lessons.
  Users can submit their written work, and optionally receive AI feedback in the future.

  ## New Tables
  - `academy_submissions`
    - `id` (uuid, PK)
    - `user_id` (uuid, FK → auth.users)
    - `lesson_id` (uuid, FK → academy_lessons)
    - `content` (text) — the submitted writing
    - `feedback` (text, nullable) — AI or instructor feedback (future use)
    - `created_at` (timestamptz)
    - `updated_at` (timestamptz)

  ## Notes
  - Multiple submissions per user per lesson are allowed (revision history)
  - Only the latest submission is typically shown by default
  - `feedback` is nullable and reserved for future AI integration

  ## Security
  - RLS enabled
  - Users can only read/insert/update their own submissions
  - Admins can read all submissions
*/

CREATE TABLE IF NOT EXISTS academy_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  lesson_id uuid NOT NULL REFERENCES academy_lessons(id) ON DELETE CASCADE,
  content text NOT NULL DEFAULT '',
  feedback text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_academy_submissions_user_id ON academy_submissions(user_id);
CREATE INDEX IF NOT EXISTS idx_academy_submissions_lesson_id ON academy_submissions(lesson_id);
CREATE INDEX IF NOT EXISTS idx_academy_submissions_user_lesson ON academy_submissions(user_id, lesson_id);

ALTER TABLE academy_submissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own submissions"
  ON academy_submissions FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own submissions"
  ON academy_submissions FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own submissions"
  ON academy_submissions FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can read all submissions"
  ON academy_submissions FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );
