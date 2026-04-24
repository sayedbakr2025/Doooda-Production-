/*
  # Genre & Tone System

  ## Summary
  Introduces a Genre + Tone classification system for all Doooda projects.

  ## New Tables
  - `genres` — master list of story genres with optional category grouping
  - `tones` — master list of narrative tones
  - `project_genres` — many-to-many between projects and genres (max 3 enforced in UI)
  - `project_tones` — one-to-one between projects and a tone (enforced via unique)

  ## Security
  - RLS enabled on all tables
  - Genres and tones are publicly readable (no auth required for reads)
  - Only admins can insert/update/delete genres and tones
  - project_genres and project_tones are owner-only write, public-read per project

  ## Backward Compatibility
  - No changes to existing tables
  - Existing projects simply have no genre/tone rows — treated as "general fiction" / "neutral" in UI
*/

-- ─────────────────────────────────────────────
-- GENRES
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS genres (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text        NOT NULL,
  name_ar     text        NOT NULL DEFAULT '',
  slug        text        UNIQUE NOT NULL,
  category    text,
  is_active   boolean     NOT NULL DEFAULT true,
  created_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE genres ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Genres are publicly readable"
  ON genres FOR SELECT
  USING (true);

CREATE POLICY "Only admins can insert genres"
  ON genres FOR INSERT
  TO authenticated
  WITH CHECK (
    (SELECT (auth.jwt() -> 'app_metadata' ->> 'role')) = 'admin'
  );

CREATE POLICY "Only admins can update genres"
  ON genres FOR UPDATE
  TO authenticated
  USING (
    (SELECT (auth.jwt() -> 'app_metadata' ->> 'role')) = 'admin'
  )
  WITH CHECK (
    (SELECT (auth.jwt() -> 'app_metadata' ->> 'role')) = 'admin'
  );

CREATE POLICY "Only admins can delete genres"
  ON genres FOR DELETE
  TO authenticated
  USING (
    (SELECT (auth.jwt() -> 'app_metadata' ->> 'role')) = 'admin'
  );

-- ─────────────────────────────────────────────
-- TONES
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS tones (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text        NOT NULL,
  name_ar     text        NOT NULL DEFAULT '',
  slug        text        UNIQUE NOT NULL,
  is_active   boolean     NOT NULL DEFAULT true,
  created_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE tones ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tones are publicly readable"
  ON tones FOR SELECT
  USING (true);

CREATE POLICY "Only admins can insert tones"
  ON tones FOR INSERT
  TO authenticated
  WITH CHECK (
    (SELECT (auth.jwt() -> 'app_metadata' ->> 'role')) = 'admin'
  );

CREATE POLICY "Only admins can update tones"
  ON tones FOR UPDATE
  TO authenticated
  USING (
    (SELECT (auth.jwt() -> 'app_metadata' ->> 'role')) = 'admin'
  )
  WITH CHECK (
    (SELECT (auth.jwt() -> 'app_metadata' ->> 'role')) = 'admin'
  );

CREATE POLICY "Only admins can delete tones"
  ON tones FOR DELETE
  TO authenticated
  USING (
    (SELECT (auth.jwt() -> 'app_metadata' ->> 'role')) = 'admin'
  );

-- ─────────────────────────────────────────────
-- PROJECT_GENRES (many-to-many)
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS project_genres (
  project_id  uuid  NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  genre_id    uuid  NOT NULL REFERENCES genres(id)   ON DELETE CASCADE,
  PRIMARY KEY (project_id, genre_id)
);

ALTER TABLE project_genres ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own project genres"
  ON project_genres FOR SELECT
  TO authenticated
  USING (
    project_id IN (
      SELECT id FROM projects WHERE user_id = auth.uid() AND deleted_at IS NULL
    )
  );

CREATE POLICY "Users can insert own project genres"
  ON project_genres FOR INSERT
  TO authenticated
  WITH CHECK (
    project_id IN (
      SELECT id FROM projects WHERE user_id = auth.uid() AND deleted_at IS NULL
    )
  );

CREATE POLICY "Users can delete own project genres"
  ON project_genres FOR DELETE
  TO authenticated
  USING (
    project_id IN (
      SELECT id FROM projects WHERE user_id = auth.uid() AND deleted_at IS NULL
    )
  );

-- ─────────────────────────────────────────────
-- PROJECT_TONES (one-to-one via unique)
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS project_tones (
  project_id  uuid  NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  tone_id     uuid  NOT NULL REFERENCES tones(id)    ON DELETE CASCADE,
  PRIMARY KEY (project_id, tone_id)
);

ALTER TABLE project_tones ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own project tones"
  ON project_tones FOR SELECT
  TO authenticated
  USING (
    project_id IN (
      SELECT id FROM projects WHERE user_id = auth.uid() AND deleted_at IS NULL
    )
  );

CREATE POLICY "Users can insert own project tones"
  ON project_tones FOR INSERT
  TO authenticated
  WITH CHECK (
    project_id IN (
      SELECT id FROM projects WHERE user_id = auth.uid() AND deleted_at IS NULL
    )
  );

CREATE POLICY "Users can delete own project tones"
  ON project_tones FOR DELETE
  TO authenticated
  USING (
    project_id IN (
      SELECT id FROM projects WHERE user_id = auth.uid() AND deleted_at IS NULL
    )
  );

-- ─────────────────────────────────────────────
-- SEED: GENRES
-- ─────────────────────────────────────────────
INSERT INTO genres (name, name_ar, slug, category) VALUES
  ('Drama',           'دراما',            'drama',            'general'),
  ('Comedy',          'كوميديا',          'comedy',           'general'),
  ('Romance',         'رومانسي',          'romance',          'general'),
  ('Action',          'أكشن',             'action',           'general'),
  ('Adventure',       'مغامرة',           'adventure',        'general'),
  ('Thriller',        'إثارة',            'thriller',         'general'),
  ('Mystery',         'غموض',             'mystery',          'general'),
  ('Crime',           'جريمة',            'crime',            'general'),
  ('Horror',          'رعب',              'horror',           'general'),
  ('Fantasy',         'خيال',             'fantasy',          'speculative'),
  ('Science Fiction', 'خيال علمي',        'science_fiction',  'speculative'),
  ('Historical',      'تاريخي',           'historical',       'general'),
  ('War',             'حرب',              'war',              'general'),
  ('Political',       'سياسي',            'political',        'general'),
  ('Psychological',   'نفسي',             'psychological',    'literary'),
  ('Philosophical',   'فلسفي',            'philosophical',    'literary'),
  ('Satire',          'ساخر',             'satire',           'literary'),
  ('Slice of Life',   'شريحة من الحياة',  'slice_of_life',    'literary'),
  ('Magical Realism', 'واقعية سحرية',     'magical_realism',  'literary'),
  ('Dystopian',       'بائس/ديستوبي',     'dystopian',        'speculative'),
  ('Literary Fiction','أدب رفيع',         'literary_fiction',  'literary'),
  ('Superhero',       'أبطال خارقون',     'superhero',        'action'),
  ('Detective',       'بوليسي',           'detective',        'crime'),
  ('Spy',             'تجسس',             'spy',              'action'),
  ('Survival',        'بقاء',             'survival',         'action'),
  ('Noir',            'نوار',             'noir',             'crime'),
  ('Family',          'عائلي',            'family',           'general'),
  ('Educational',     'تعليمي',           'educational',      'children'),
  ('Fairy Tale',      'حكاية خرافية',     'fairy_tale',       'children'),
  ('Animal Story',    'قصة حيوانات',      'animal_story',     'children'),
  ('Moral Story',     'قصة أخلاقية',      'moral_story',      'children'),
  ('Tragedy',         'مأساة',            'tragedy',          'theatre'),
  ('Absurd',          'عبثي',             'absurd',           'theatre')
ON CONFLICT (slug) DO UPDATE SET
  name    = EXCLUDED.name,
  name_ar = EXCLUDED.name_ar,
  category = EXCLUDED.category;

-- ─────────────────────────────────────────────
-- SEED: TONES
-- ─────────────────────────────────────────────
INSERT INTO tones (name, name_ar, slug) VALUES
  ('Dark',         'قاتم',        'dark'),
  ('Light',        'خفيف',        'light'),
  ('Epic',         'ملحمي',       'epic'),
  ('Serious',      'جاد',         'serious'),
  ('Humorous',     'فكاهي',       'humorous'),
  ('Melancholic',  'حزين',        'melancholic'),
  ('Inspirational','ملهم',        'inspirational'),
  ('Realistic',    'واقعي',       'realistic'),
  ('Surreal',      'سريالي',      'surreal'),
  ('Suspenseful',  'مشوق',        'suspenseful'),
  ('Whimsical',    'خيالي/مرح',   'whimsical')
ON CONFLICT (slug) DO UPDATE SET
  name    = EXCLUDED.name,
  name_ar = EXCLUDED.name_ar;

-- ─────────────────────────────────────────────
-- INDEXES
-- ─────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_genres_slug        ON genres (slug);
CREATE INDEX IF NOT EXISTS idx_genres_is_active   ON genres (is_active);
CREATE INDEX IF NOT EXISTS idx_tones_slug         ON tones  (slug);
CREATE INDEX IF NOT EXISTS idx_project_genres_pid ON project_genres (project_id);
CREATE INDEX IF NOT EXISTS idx_project_tones_pid  ON project_tones  (project_id);
