-- Phase 1: Add category, language, is_paid to academy_courses
ALTER TABLE academy_courses ADD COLUMN IF NOT EXISTS category text DEFAULT '';
ALTER TABLE academy_courses ADD COLUMN IF NOT EXISTS language text DEFAULT 'ar' CHECK (language IN ('ar', 'en', 'both'));
ALTER TABLE academy_courses ADD COLUMN IF NOT EXISTS is_paid boolean DEFAULT false;

-- Migrate existing is_free to is_paid (is_paid = NOT is_free)
UPDATE academy_courses SET is_paid = NOT is_free WHERE is_paid = false AND is_free = true;

-- Phase 4: Create lesson_documents table
CREATE TABLE IF NOT EXISTS academy_lesson_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lesson_id uuid NOT NULL REFERENCES academy_lessons(id) ON DELETE CASCADE,
  title text NOT NULL DEFAULT '',
  file_url text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE academy_lesson_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view lesson documents of published courses"
  ON academy_lesson_documents
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM academy_lessons al
      JOIN academy_modules am ON am.id = al.module_id
      JOIN academy_courses ac ON ac.id = am.course_id
      WHERE al.id = academy_lesson_documents.lesson_id
        AND ac.is_published = true
    )
  );

CREATE POLICY "Admins can insert lesson documents"
  ON academy_lesson_documents
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.jwt() -> 'app_metadata' ->> 'role' = 'admin'
    OR EXISTS (
      SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'admin'
    )
  );

CREATE POLICY "Admins can update lesson documents"
  ON academy_lesson_documents
  FOR UPDATE
  TO authenticated
  USING (
    auth.jwt() -> 'app_metadata' ->> 'role' = 'admin'
    OR EXISTS (
      SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'admin'
    )
  );

CREATE POLICY "Admins can delete lesson documents"
  ON academy_lesson_documents
  FOR DELETE
  TO authenticated
  USING (
    auth.jwt() -> 'app_metadata' ->> 'role' = 'admin'
    OR EXISTS (
      SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'admin'
    )
  );

CREATE INDEX IF NOT EXISTS idx_lesson_documents_lesson ON academy_lesson_documents(lesson_id);