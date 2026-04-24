/*
  # إنشاء جدول ربط المراجع بالنصوص

  1. جدول جديد
    - `scene_references`
      - `id` (uuid, primary key)
      - `scene_id` (uuid, foreign key to scenes)
      - `reference_id` (uuid, foreign key to book_references)
      - `text_content` (text) - النص المظلل
      - `start_position` (integer) - موضع بداية النص
      - `end_position` (integer) - موضع نهاية النص
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. الأمان
    - تفعيل RLS على جدول `scene_references`
    - سياسات للقراءة والإنشاء والحذف
*/

CREATE TABLE IF NOT EXISTS scene_references (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  scene_id uuid NOT NULL REFERENCES scenes(id) ON DELETE CASCADE,
  reference_id uuid NOT NULL REFERENCES book_references(id) ON DELETE CASCADE,
  text_content text NOT NULL,
  start_position integer NOT NULL DEFAULT 0,
  end_position integer NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE scene_references ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view scene references through scenes"
  ON scene_references FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM scenes s
      JOIN chapters c ON s.chapter_id = c.id
      JOIN projects p ON c.project_id = p.id
      WHERE s.id = scene_references.scene_id
      AND p.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert scene references"
  ON scene_references FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM scenes s
      JOIN chapters c ON s.chapter_id = c.id
      JOIN projects p ON c.project_id = p.id
      WHERE s.id = scene_references.scene_id
      AND p.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete scene references"
  ON scene_references FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM scenes s
      JOIN chapters c ON s.chapter_id = c.id
      JOIN projects p ON c.project_id = p.id
      WHERE s.id = scene_references.scene_id
      AND p.user_id = auth.uid()
    )
  );

CREATE INDEX IF NOT EXISTS idx_scene_references_scene_id ON scene_references(scene_id);
CREATE INDEX IF NOT EXISTS idx_scene_references_reference_id ON scene_references(reference_id);
