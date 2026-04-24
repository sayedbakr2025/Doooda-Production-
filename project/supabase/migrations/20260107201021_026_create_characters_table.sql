/*
  # Create Characters Table

  1. New Tables
    - `characters`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references users) - character owner
      - `project_id` (uuid, references projects) - associated project
      - `name` (text) - character name
      - `age` (text, nullable) - character age
      - `gender` (text, nullable) - character gender
      - `clothing_style` (text, nullable) - how character dresses
      - `speech_style` (text, nullable) - how character speaks
      - `psychological_issue` (text, nullable) - mental/emotional challenges
      - `likes` (text, nullable) - things character enjoys
      - `dislikes` (text, nullable) - things character avoids
      - `fears` (text, nullable) - what character fears
      - `childhood_trauma` (text, nullable) - past traumatic events
      - `trauma_impact_adulthood` (text, nullable) - how trauma affects them now
      - `education` (text, nullable) - educational background
      - `job` (text, nullable) - current occupation
      - `work_relationships` (text, nullable) - relationships with colleagues
      - `residence` (text, nullable) - where character lives
      - `neighbor_relationships` (text, nullable) - relationships with neighbors
      - `life_goal` (text, nullable) - character's primary life objective
      - `created_at` (timestamptz, default now())
      - `updated_at` (timestamptz, default now())
      - `deleted_at` (timestamptz, nullable) - soft delete

  2. Security
    - Enable RLS on `characters` table
    - Writers can only view their own characters
    - Writers can create characters for their own projects
    - Writers can update their own characters
    - Writers can soft-delete their own characters

  3. Indexes
    - Index on (user_id, project_id, deleted_at) for character list queries
    - Index on (project_id, name) for searching characters by name

  4. Important Notes
    - Only name is required, all other fields optional
    - Fields store text (can be long descriptions)
    - Character prompt generator uses all fields to create AI prompt
    - Soft delete preserves character history
    - Characters belong to specific project
*/

CREATE TABLE IF NOT EXISTS characters (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  name text NOT NULL CHECK (length(name) > 0),
  age text,
  gender text,
  clothing_style text,
  speech_style text,
  psychological_issue text,
  likes text,
  dislikes text,
  fears text,
  childhood_trauma text,
  trauma_impact_adulthood text,
  education text,
  job text,
  work_relationships text,
  residence text,
  neighbor_relationships text,
  life_goal text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  deleted_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_characters_user_project ON characters(user_id, project_id, deleted_at);
CREATE INDEX IF NOT EXISTS idx_characters_project_name ON characters(project_id, name);

ALTER TABLE characters ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Writers can view own characters"
  ON characters FOR SELECT
  TO authenticated
  USING (user_id = auth.uid() AND deleted_at IS NULL);

CREATE POLICY "Writers can create characters"
  ON characters FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = characters.project_id
      AND projects.user_id = auth.uid()
      AND projects.deleted_at IS NULL
    )
  );

CREATE POLICY "Writers can update own characters"
  ON characters FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid() AND deleted_at IS NULL)
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Writers can soft-delete own characters"
  ON characters FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE OR REPLACE FUNCTION update_character_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER characters_updated_at
  BEFORE UPDATE ON characters
  FOR EACH ROW
  EXECUTE FUNCTION update_character_timestamp();

COMMENT ON TABLE characters IS 'Character profiles for story projects';
COMMENT ON COLUMN characters.name IS 'Character name (required)';
COMMENT ON COLUMN characters.clothing_style IS 'How the character dresses';
COMMENT ON COLUMN characters.speech_style IS 'How the character speaks';
COMMENT ON COLUMN characters.psychological_issue IS 'Mental or emotional challenges';
COMMENT ON COLUMN characters.trauma_impact_adulthood IS 'How childhood trauma affects character as adult';
COMMENT ON COLUMN characters.work_relationships IS 'Relationships with colleagues';
COMMENT ON COLUMN characters.neighbor_relationships IS 'Relationships with neighbors';
COMMENT ON COLUMN characters.life_goal IS 'Character primary life objective';
