/*
  # Create KDP Metadata Table

  ## Purpose
  Stores Amazon KDP (Kindle Direct Publishing) metadata for each project.
  Users can save all book details required for KDP submission in one place.

  ## New Tables

  ### kdp_metadata
  - `id` (uuid, primary key) — unique record identifier
  - `project_id` (uuid, fk → projects.id) — owning project, unique constraint (one record per project)
  - `title` (text) — book title
  - `subtitle` (text) — book subtitle
  - `author_name` (text) — primary author name
  - `contributors` (jsonb) — co-authors, editors, illustrators, etc.
  - `series_name` (text) — series name if applicable
  - `edition_number` (text) — edition number (e.g., "1st", "2nd")
  - `language` (text) — book language code (e.g., "ar", "en"), defaults to "ar"
  - `description` (text) — book marketing description (min 150 words recommended)
  - `keywords` (jsonb) — array of up to 7 keywords
  - `categories` (jsonb) — array of KDP browse categories (min 2)
  - `isbn` (text) — ISBN number if assigned
  - `publication_date` (date) — planned or actual publication date
  - `trim_size` (text) — print trim size (e.g., "6x9", "5x8")
  - `bleed_enabled` (boolean) — whether print file uses bleed margins
  - `interior_type` (text) — "black_white" or "premium_color"
  - `created_at` (timestamptz) — record creation time
  - `updated_at` (timestamptz) — record last-update time

  ## Security
  - RLS enabled: users can only access metadata for their own projects
  - Policies:
    - SELECT: owner of the project can read
    - INSERT: owner of the project can create
    - UPDATE: owner of the project can update
    - DELETE: owner of the project can delete

  ## Notes
  1. One-to-one relationship with projects (UNIQUE on project_id)
  2. contributors stored as JSONB array: [{name, role}]
  3. keywords stored as JSONB string array
  4. categories stored as JSONB string array
*/

CREATE TABLE IF NOT EXISTS kdp_metadata (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id       uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  title            text NOT NULL DEFAULT '',
  subtitle         text NOT NULL DEFAULT '',
  author_name      text NOT NULL DEFAULT '',
  contributors     jsonb NOT NULL DEFAULT '[]',
  series_name      text NOT NULL DEFAULT '',
  edition_number   text NOT NULL DEFAULT '',
  language         text NOT NULL DEFAULT 'ar',
  description      text NOT NULL DEFAULT '',
  keywords         jsonb NOT NULL DEFAULT '[]',
  categories       jsonb NOT NULL DEFAULT '[]',
  isbn             text NOT NULL DEFAULT '',
  publication_date date,
  trim_size        text NOT NULL DEFAULT '',
  bleed_enabled    boolean NOT NULL DEFAULT false,
  interior_type    text NOT NULL DEFAULT 'black_white',
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT kdp_metadata_project_id_unique UNIQUE (project_id),
  CONSTRAINT kdp_metadata_interior_type_check CHECK (interior_type IN ('black_white', 'premium_color'))
);

ALTER TABLE kdp_metadata ENABLE ROW LEVEL SECURITY;

CREATE POLICY "kdp_metadata: owner can select"
  ON kdp_metadata FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = kdp_metadata.project_id
        AND projects.user_id = auth.uid()
        AND projects.deleted_at IS NULL
    )
  );

CREATE POLICY "kdp_metadata: owner can insert"
  ON kdp_metadata FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = kdp_metadata.project_id
        AND projects.user_id = auth.uid()
        AND projects.deleted_at IS NULL
    )
  );

CREATE POLICY "kdp_metadata: owner can update"
  ON kdp_metadata FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = kdp_metadata.project_id
        AND projects.user_id = auth.uid()
        AND projects.deleted_at IS NULL
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = kdp_metadata.project_id
        AND projects.user_id = auth.uid()
        AND projects.deleted_at IS NULL
    )
  );

CREATE POLICY "kdp_metadata: owner can delete"
  ON kdp_metadata FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = kdp_metadata.project_id
        AND projects.user_id = auth.uid()
        AND projects.deleted_at IS NULL
    )
  );

CREATE INDEX IF NOT EXISTS idx_kdp_metadata_project_id ON kdp_metadata (project_id);

CREATE OR REPLACE FUNCTION update_kdp_metadata_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER kdp_metadata_updated_at
  BEFORE UPDATE ON kdp_metadata
  FOR EACH ROW EXECUTE FUNCTION update_kdp_metadata_updated_at();
