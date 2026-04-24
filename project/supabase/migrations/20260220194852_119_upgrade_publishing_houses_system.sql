/*
  # Upgrade Publishing Houses System

  ## Summary
  Complete overhaul of the publisher directory into a scalable, filterable system.

  ## New Tables

  ### 1. publishing_houses
  Replaces the old `publishers` table concept with a richer, structured table.
  - `id` — uuid primary key
  - `name` — display name (Arabic or primary)
  - `logo_url` — URL to logo image
  - `description` — full description text
  - `country` — country name (Arabic)
  - `country_en` — country name (English)
  - `accepts_submissions` — boolean flag
  - `submission_email` — direct submission email
  - `submission_link` — URL to submission portal
  - `publication_type` — enum: print | digital | print_digital
  - `project_types_supported` — text array: novel, short_stories, film_screenplay, tv_series, theatre, radio_series, children_book
  - `entity_type` — future-proof: publisher | production_company | agency | festival
  - `is_active` — soft-delete / visibility flag
  - `sort_order` — manual ordering
  - `created_at`, `updated_at`

  ### 2. publishing_categories
  Admin-managed category list (unlimited).
  - `id`, `name`, `slug`, `created_at`

  ### 3. publishing_house_categories
  Many-to-many pivot between publishing_houses and publishing_categories.
  - `publishing_house_id`, `category_id`

  ## Indexes
  - country, entity_type, is_active, accepts_submissions for fast filtering
  - GIN index on project_types_supported array

  ## Security
  - RLS enabled on all three tables
  - Authenticated users can SELECT active publishing_houses
  - Only admins (JWT role = admin) can INSERT/UPDATE/DELETE
*/

-- ─────────────────────────────────────────
-- 1. publishing_houses
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS publishing_houses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL DEFAULT '',
  logo_url text DEFAULT '',
  description text DEFAULT '',
  country text DEFAULT '',
  country_en text DEFAULT '',
  accepts_submissions boolean DEFAULT true,
  submission_email text DEFAULT '',
  submission_link text DEFAULT '',
  publication_type text DEFAULT 'print' CHECK (publication_type IN ('print', 'digital', 'print_digital')),
  project_types_supported text[] DEFAULT '{}',
  entity_type text DEFAULT 'publisher' CHECK (entity_type IN ('publisher', 'production_company', 'agency', 'festival')),
  is_active boolean DEFAULT true,
  sort_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- ─────────────────────────────────────────
-- 2. publishing_categories
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS publishing_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL DEFAULT '',
  slug text NOT NULL DEFAULT '',
  created_at timestamptz DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS publishing_categories_slug_idx ON publishing_categories (slug);

-- ─────────────────────────────────────────
-- 3. Pivot table
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS publishing_house_categories (
  publishing_house_id uuid NOT NULL REFERENCES publishing_houses(id) ON DELETE CASCADE,
  category_id uuid NOT NULL REFERENCES publishing_categories(id) ON DELETE CASCADE,
  PRIMARY KEY (publishing_house_id, category_id)
);

-- ─────────────────────────────────────────
-- Indexes for performance
-- ─────────────────────────────────────────
CREATE INDEX IF NOT EXISTS publishing_houses_country_idx ON publishing_houses (country);
CREATE INDEX IF NOT EXISTS publishing_houses_entity_type_idx ON publishing_houses (entity_type);
CREATE INDEX IF NOT EXISTS publishing_houses_is_active_idx ON publishing_houses (is_active);
CREATE INDEX IF NOT EXISTS publishing_houses_accepts_idx ON publishing_houses (accepts_submissions);
CREATE INDEX IF NOT EXISTS publishing_houses_project_types_idx ON publishing_houses USING GIN (project_types_supported);
CREATE INDEX IF NOT EXISTS publishing_house_categories_house_idx ON publishing_house_categories (publishing_house_id);
CREATE INDEX IF NOT EXISTS publishing_house_categories_cat_idx ON publishing_house_categories (category_id);

-- ─────────────────────────────────────────
-- RLS: publishing_houses
-- ─────────────────────────────────────────
ALTER TABLE publishing_houses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view active publishing houses"
  ON publishing_houses FOR SELECT
  TO authenticated
  USING (is_active = true);

CREATE POLICY "Admins can view all publishing houses"
  ON publishing_houses FOR SELECT
  TO authenticated
  USING ((auth.jwt() ->> 'role') = 'admin');

CREATE POLICY "Admins can insert publishing houses"
  ON publishing_houses FOR INSERT
  TO authenticated
  WITH CHECK ((auth.jwt() ->> 'role') = 'admin');

CREATE POLICY "Admins can update publishing houses"
  ON publishing_houses FOR UPDATE
  TO authenticated
  USING ((auth.jwt() ->> 'role') = 'admin')
  WITH CHECK ((auth.jwt() ->> 'role') = 'admin');

CREATE POLICY "Admins can delete publishing houses"
  ON publishing_houses FOR DELETE
  TO authenticated
  USING ((auth.jwt() ->> 'role') = 'admin');

-- ─────────────────────────────────────────
-- RLS: publishing_categories
-- ─────────────────────────────────────────
ALTER TABLE publishing_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view categories"
  ON publishing_categories FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can insert categories"
  ON publishing_categories FOR INSERT
  TO authenticated
  WITH CHECK ((auth.jwt() ->> 'role') = 'admin');

CREATE POLICY "Admins can update categories"
  ON publishing_categories FOR UPDATE
  TO authenticated
  USING ((auth.jwt() ->> 'role') = 'admin')
  WITH CHECK ((auth.jwt() ->> 'role') = 'admin');

CREATE POLICY "Admins can delete categories"
  ON publishing_categories FOR DELETE
  TO authenticated
  USING ((auth.jwt() ->> 'role') = 'admin');

-- ─────────────────────────────────────────
-- RLS: publishing_house_categories
-- ─────────────────────────────────────────
ALTER TABLE publishing_house_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view pivot"
  ON publishing_house_categories FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can insert pivot"
  ON publishing_house_categories FOR INSERT
  TO authenticated
  WITH CHECK ((auth.jwt() ->> 'role') = 'admin');

CREATE POLICY "Admins can delete pivot"
  ON publishing_house_categories FOR DELETE
  TO authenticated
  USING ((auth.jwt() ->> 'role') = 'admin');

-- ─────────────────────────────────────────
-- Seed default categories
-- ─────────────────────────────────────────
INSERT INTO publishing_categories (name, slug) VALUES
  ('أدب اجتماعي', 'social-fiction'),
  ('فانتازيا', 'fantasy'),
  ('رعب', 'horror'),
  ('تاريخي', 'historical'),
  ('أطفال', 'children'),
  ('سينما', 'cinema'),
  ('مسرح', 'theatre'),
  ('YA', 'ya'),
  ('Literary Fiction', 'literary-fiction'),
  ('روايات بوليسية', 'mystery'),
  ('خيال علمي', 'sci-fi'),
  ('رومانسي', 'romance')
ON CONFLICT (slug) DO NOTHING;
