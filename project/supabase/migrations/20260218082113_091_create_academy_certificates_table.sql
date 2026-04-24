/*
  # Create Academy Certificates Table

  ## Overview
  Adds a certificate record system for the Doooda Academy.
  When a user completes 100% of a course, a certificate record is automatically
  issued. This phase stores the data only — PDF generation is out of scope.

  ## New Tables

  ### academy_certificates
  - `id` (uuid) — primary key
  - `user_id` (uuid) — references auth.users
  - `course_id` (uuid) — references academy_courses
  - `enrollment_id` (uuid) — references academy_enrollments
  - `issued_at` (timestamptz) — when certificate was generated
  - UNIQUE(user_id, course_id) — one certificate per course per user

  ## Security
  - RLS enabled
  - Users can only read their own certificates
  - Insert allowed for authenticated users (only for themselves)
  - No update or delete — certificates are immutable once issued

  ## Notes
  1. The certificate number is derived from the UUID — no separate sequence needed
  2. Indexes added for fast lookup by user and by course
*/

CREATE TABLE IF NOT EXISTS academy_certificates (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  course_id     uuid NOT NULL REFERENCES academy_courses(id) ON DELETE CASCADE,
  enrollment_id uuid NOT NULL REFERENCES academy_enrollments(id) ON DELETE CASCADE,
  issued_at     timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, course_id)
);

ALTER TABLE academy_certificates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own certificates"
  ON academy_certificates
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own certificates"
  ON academy_certificates
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_academy_certificates_user ON academy_certificates(user_id);
CREATE INDEX IF NOT EXISTS idx_academy_certificates_course ON academy_certificates(course_id);
