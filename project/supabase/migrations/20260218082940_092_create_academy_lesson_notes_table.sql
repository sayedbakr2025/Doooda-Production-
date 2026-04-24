/*
  # Create Academy Lesson Notes Table

  ## Purpose
  Stores per-user, per-lesson notes that persist across sessions.
  Users can write and save private notes while watching a lesson.

  ## New Tables
  - `academy_lesson_notes`
    - `id` (uuid, PK)
    - `user_id` (uuid, FK → auth.users)
    - `lesson_id` (uuid, FK → academy_lessons)
    - `content` (text) — the note content
    - `updated_at` (timestamptz) — last save time
    - `created_at` (timestamptz)
    - UNIQUE(user_id, lesson_id) — one note per user per lesson

  ## Security
  - RLS enabled
  - Users can only read/insert/update/delete their own notes
  - Admins can read all notes
*/

CREATE TABLE IF NOT EXISTS academy_lesson_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  lesson_id uuid NOT NULL REFERENCES academy_lessons(id) ON DELETE CASCADE,
  content text NOT NULL DEFAULT '',
  updated_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, lesson_id)
);

CREATE INDEX IF NOT EXISTS idx_academy_lesson_notes_user_id ON academy_lesson_notes(user_id);
CREATE INDEX IF NOT EXISTS idx_academy_lesson_notes_lesson_id ON academy_lesson_notes(lesson_id);

ALTER TABLE academy_lesson_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own lesson notes"
  ON academy_lesson_notes FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own lesson notes"
  ON academy_lesson_notes FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own lesson notes"
  ON academy_lesson_notes FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own lesson notes"
  ON academy_lesson_notes FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can read all lesson notes"
  ON academy_lesson_notes FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );
