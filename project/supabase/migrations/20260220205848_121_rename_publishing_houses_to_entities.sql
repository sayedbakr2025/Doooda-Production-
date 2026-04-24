/*
  # Rename Publishing Houses to Publishing Entities

  ## Summary
  Renames publishing_houses → publishing_entities and publishing_house_categories → publishing_entity_categories
  to match the new unified publishing system spec. Drops and recreates all RLS policies
  under the new table names.

  ## Changes

  ### Renamed Tables
  - `publishing_houses` → `publishing_entities`
  - `publishing_house_categories` → `publishing_entity_categories`

  ### publishing_entities
  All existing columns preserved. No data loss.

  ### publishing_entity_categories
  Pivot table renamed. Foreign key now references publishing_entities(id).

  ### publishing_categories
  Unchanged — already matches spec.

  ## Security
  - All existing RLS policies dropped (they reference the old table names internally via Postgres)
  - New RLS policies created on renamed tables
  - Admins (JWT role = admin) have full CRUD
  - Authenticated users can SELECT active entries

  ## Notes
  1. Uses ALTER TABLE RENAME — zero data loss
  2. Indexes are automatically renamed along with the table in Postgres
  3. ON CONFLICT (slug) seed is safe — already inserted
*/

-- ─────────────────────────────────────────
-- Drop old RLS policies before rename
-- ─────────────────────────────────────────
DROP POLICY IF EXISTS "Authenticated users can view active publishing houses" ON publishing_houses;
DROP POLICY IF EXISTS "Admins can view all publishing houses" ON publishing_houses;
DROP POLICY IF EXISTS "Admins can insert publishing houses" ON publishing_houses;
DROP POLICY IF EXISTS "Admins can update publishing houses" ON publishing_houses;
DROP POLICY IF EXISTS "Admins can delete publishing houses" ON publishing_houses;

DROP POLICY IF EXISTS "Authenticated users can view pivot" ON publishing_house_categories;
DROP POLICY IF EXISTS "Admins can insert pivot" ON publishing_house_categories;
DROP POLICY IF EXISTS "Admins can delete pivot" ON publishing_house_categories;

-- ─────────────────────────────────────────
-- Rename pivot first (has FK to houses)
-- ─────────────────────────────────────────
ALTER TABLE publishing_house_categories RENAME TO publishing_entity_categories;

-- Rename the FK column and constraint to match new naming
ALTER TABLE publishing_entity_categories RENAME COLUMN publishing_house_id TO entity_id;

-- ─────────────────────────────────────────
-- Rename main table
-- ─────────────────────────────────────────
ALTER TABLE publishing_houses RENAME TO publishing_entities;

-- ─────────────────────────────────────────
-- RLS: publishing_entities
-- ─────────────────────────────────────────
ALTER TABLE publishing_entities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view active publishing entities"
  ON publishing_entities FOR SELECT
  TO authenticated
  USING (is_active = true);

CREATE POLICY "Admins can view all publishing entities"
  ON publishing_entities FOR SELECT
  TO authenticated
  USING ((auth.jwt() ->> 'role') = 'admin');

CREATE POLICY "Admins can insert publishing entities"
  ON publishing_entities FOR INSERT
  TO authenticated
  WITH CHECK ((auth.jwt() ->> 'role') = 'admin');

CREATE POLICY "Admins can update publishing entities"
  ON publishing_entities FOR UPDATE
  TO authenticated
  USING ((auth.jwt() ->> 'role') = 'admin')
  WITH CHECK ((auth.jwt() ->> 'role') = 'admin');

CREATE POLICY "Admins can delete publishing entities"
  ON publishing_entities FOR DELETE
  TO authenticated
  USING ((auth.jwt() ->> 'role') = 'admin');

-- ─────────────────────────────────────────
-- RLS: publishing_entity_categories (pivot)
-- ─────────────────────────────────────────
ALTER TABLE publishing_entity_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view entity categories"
  ON publishing_entity_categories FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can insert entity categories"
  ON publishing_entity_categories FOR INSERT
  TO authenticated
  WITH CHECK ((auth.jwt() ->> 'role') = 'admin');

CREATE POLICY "Admins can delete entity categories"
  ON publishing_entity_categories FOR DELETE
  TO authenticated
  USING ((auth.jwt() ->> 'role') = 'admin');

-- ─────────────────────────────────────────
-- Rebuild indexes with new table name
-- ─────────────────────────────────────────
DROP INDEX IF EXISTS publishing_houses_country_idx;
DROP INDEX IF EXISTS publishing_houses_entity_type_idx;
DROP INDEX IF EXISTS publishing_houses_is_active_idx;
DROP INDEX IF EXISTS publishing_houses_accepts_idx;
DROP INDEX IF EXISTS publishing_houses_project_types_idx;
DROP INDEX IF EXISTS publishing_house_categories_house_idx;
DROP INDEX IF EXISTS publishing_house_categories_cat_idx;

CREATE INDEX IF NOT EXISTS publishing_entities_country_idx ON publishing_entities (country);
CREATE INDEX IF NOT EXISTS publishing_entities_entity_type_idx ON publishing_entities (entity_type);
CREATE INDEX IF NOT EXISTS publishing_entities_is_active_idx ON publishing_entities (is_active);
CREATE INDEX IF NOT EXISTS publishing_entities_accepts_idx ON publishing_entities (accepts_submissions);
CREATE INDEX IF NOT EXISTS publishing_entities_project_types_idx ON publishing_entities USING GIN (project_types_supported);
CREATE INDEX IF NOT EXISTS publishing_entity_categories_entity_idx ON publishing_entity_categories (entity_id);
CREATE INDEX IF NOT EXISTS publishing_entity_categories_cat_idx ON publishing_entity_categories (category_id);
