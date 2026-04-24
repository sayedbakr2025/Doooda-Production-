/*
  # Create Academy Tables

  ## Overview
  Creates the full academy system foundation for Doooda Academy, supporting structured
  courses with modules, lessons, enrollments, and progress tracking.

  ## New Tables

  ### academy_courses
  - Top-level course entity with bilingual titles (Arabic + English)
  - Supports free/paid visibility with token-based pricing
  - Level classification: beginner, intermediate, advanced
  - Published/draft status control via is_published
  - Display ordering via order_index

  ### academy_modules
  - Groups lessons within a course
  - Ordered by order_index within each course

  ### academy_lessons
  - Individual learning units within a module
  - Supports multiple content types: video, article, exercise, pdf
  - is_preview flag allows free access to select lessons in paid courses
  - Duration tracking in minutes

  ### academy_enrollments
  - Tracks which users are enrolled in which courses
  - Stores progress percentage and completion timestamp

  ### academy_progress
  - Granular per-lesson completion tracking per user
  - Used to compute enrollment-level progress

  ## Security
  - RLS enabled on all tables
  - Public can read published courses and modules/lessons (for browsing)
  - Only authenticated users can enroll and track progress
  - Users can only read/write their own enrollment and progress data
  - No direct admin write policies (admin uses service role or edge functions)

  ## Notes
  1. academy_enrollments has a unique constraint on (user_id, course_id)
  2. academy_progress has a unique constraint on (user_id, lesson_id)
  3. Indexes added for common query patterns
*/

-- ─── academy_courses ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS academy_courses (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title_ar        text NOT NULL DEFAULT '',
  title_en        text NOT NULL DEFAULT '',
  description     text NOT NULL DEFAULT '',
  level           text NOT NULL DEFAULT 'beginner'
                    CHECK (level IN ('beginner', 'intermediate', 'advanced')),
  is_free         boolean NOT NULL DEFAULT true,
  price_tokens    integer,
  is_published    boolean NOT NULL DEFAULT false,
  cover_image     text,
  order_index     integer NOT NULL DEFAULT 0,
  created_at      timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE academy_courses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view published courses"
  ON academy_courses
  FOR SELECT
  USING (is_published = true);

CREATE POLICY "Admins can insert courses"
  ON academy_courses
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
        AND users.role = 'admin'
    )
  );

CREATE POLICY "Admins can update courses"
  ON academy_courses
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
        AND users.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
        AND users.role = 'admin'
    )
  );

CREATE POLICY "Admins can delete courses"
  ON academy_courses
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
        AND users.role = 'admin'
    )
  );

-- ─── academy_modules ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS academy_modules (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id   uuid NOT NULL REFERENCES academy_courses(id) ON DELETE CASCADE,
  title       text NOT NULL DEFAULT '',
  order_index integer NOT NULL DEFAULT 0,
  created_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE academy_modules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view modules of published courses"
  ON academy_modules
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM academy_courses
      WHERE academy_courses.id = academy_modules.course_id
        AND academy_courses.is_published = true
    )
  );

CREATE POLICY "Admins can insert modules"
  ON academy_modules
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
        AND users.role = 'admin'
    )
  );

CREATE POLICY "Admins can update modules"
  ON academy_modules
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
        AND users.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
        AND users.role = 'admin'
    )
  );

CREATE POLICY "Admins can delete modules"
  ON academy_modules
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
        AND users.role = 'admin'
    )
  );

-- ─── academy_lessons ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS academy_lessons (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  module_id        uuid NOT NULL REFERENCES academy_modules(id) ON DELETE CASCADE,
  title            text NOT NULL DEFAULT '',
  content_type     text NOT NULL DEFAULT 'video'
                     CHECK (content_type IN ('video', 'article', 'exercise', 'pdf')),
  content_url      text,
  duration_minutes integer,
  order_index      integer NOT NULL DEFAULT 0,
  is_preview       boolean NOT NULL DEFAULT false,
  created_at       timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE academy_lessons ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view lessons of published course modules"
  ON academy_lessons
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM academy_modules am
      JOIN academy_courses ac ON ac.id = am.course_id
      WHERE am.id = academy_lessons.module_id
        AND ac.is_published = true
    )
  );

CREATE POLICY "Admins can insert lessons"
  ON academy_lessons
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
        AND users.role = 'admin'
    )
  );

CREATE POLICY "Admins can update lessons"
  ON academy_lessons
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
        AND users.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
        AND users.role = 'admin'
    )
  );

CREATE POLICY "Admins can delete lessons"
  ON academy_lessons
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
        AND users.role = 'admin'
    )
  );

-- ─── academy_enrollments ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS academy_enrollments (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  course_id           uuid NOT NULL REFERENCES academy_courses(id) ON DELETE CASCADE,
  progress_percentage integer NOT NULL DEFAULT 0,
  completed_at        timestamptz,
  created_at          timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, course_id)
);

ALTER TABLE academy_enrollments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own enrollments"
  ON academy_enrollments
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own enrollments"
  ON academy_enrollments
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own enrollments"
  ON academy_enrollments
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own enrollments"
  ON academy_enrollments
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- ─── academy_progress ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS academy_progress (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  lesson_id    uuid NOT NULL REFERENCES academy_lessons(id) ON DELETE CASCADE,
  completed    boolean NOT NULL DEFAULT false,
  completed_at timestamptz,
  UNIQUE(user_id, lesson_id)
);

ALTER TABLE academy_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own lesson progress"
  ON academy_progress
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own lesson progress"
  ON academy_progress
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own lesson progress"
  ON academy_progress
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own lesson progress"
  ON academy_progress
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- ─── Indexes ───────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_academy_courses_published ON academy_courses(is_published);
CREATE INDEX IF NOT EXISTS idx_academy_courses_order ON academy_courses(order_index);
CREATE INDEX IF NOT EXISTS idx_academy_modules_course ON academy_modules(course_id, order_index);
CREATE INDEX IF NOT EXISTS idx_academy_lessons_module ON academy_lessons(module_id, order_index);
CREATE INDEX IF NOT EXISTS idx_academy_enrollments_user ON academy_enrollments(user_id);
CREATE INDEX IF NOT EXISTS idx_academy_enrollments_course ON academy_enrollments(course_id);
CREATE INDEX IF NOT EXISTS idx_academy_progress_user ON academy_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_academy_progress_lesson ON academy_progress(lesson_id);
