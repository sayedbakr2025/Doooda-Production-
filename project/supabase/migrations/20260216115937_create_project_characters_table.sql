/*
  # Create Project Characters Table

  1. New Table
    - `project_characters`
      - `id` (uuid, primary key) - unique identifier
      - `project_id` (uuid, foreign key) - references projects table
      - `name` (text, required) - internal character name
      - `dialogue_name` (text, required) - name used in dialogue injection
      - `description` (text) - character description
      - `personality_traits` (text) - character personality
      - `background` (text) - character backstory
      - `speaking_style` (text) - how character speaks
      - `goals` (text) - character goals
      - `fears` (text) - character fears
      - `created_at` (timestamp) - creation timestamp

  2. Constraints
    - `dialogue_name` must be unique per project
    - Foreign key cascade delete when project is deleted
    - All text fields support full Unicode

  3. Security
    - Enable RLS on table
    - Users can only access characters of projects they own
    - All CRUD operations require project ownership verification

  4. Performance
    - Index on project_id for fast lookups
    - Unique constraint index on (project_id, dialogue_name)
    - Index on created_at for sorting
*/

-- Create project_characters table
CREATE TABLE IF NOT EXISTS project_characters (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  name text NOT NULL,
  dialogue_name text NOT NULL,
  description text DEFAULT '',
  personality_traits text DEFAULT '',
  background text DEFAULT '',
  speaking_style text DEFAULT '',
  goals text DEFAULT '',
  fears text DEFAULT '',
  created_at timestamptz DEFAULT now()
);

-- Add unique constraint for dialogue_name per project
CREATE UNIQUE INDEX IF NOT EXISTS project_characters_unique_dialogue_name
  ON project_characters(project_id, dialogue_name);

-- Add index for performance
CREATE INDEX IF NOT EXISTS project_characters_project_id_idx
  ON project_characters(project_id);

CREATE INDEX IF NOT EXISTS project_characters_created_at_idx
  ON project_characters(created_at DESC);

-- Enable RLS
ALTER TABLE project_characters ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view characters of projects they own
CREATE POLICY "Users can view own project characters"
  ON project_characters
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = project_characters.project_id
      AND projects.user_id = auth.uid()
    )
  );

-- Policy: Users can insert characters to projects they own
CREATE POLICY "Users can insert characters to own projects"
  ON project_characters
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = project_characters.project_id
      AND projects.user_id = auth.uid()
    )
  );

-- Policy: Users can update characters of projects they own
CREATE POLICY "Users can update own project characters"
  ON project_characters
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = project_characters.project_id
      AND projects.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = project_characters.project_id
      AND projects.user_id = auth.uid()
    )
  );

-- Policy: Users can delete characters of projects they own
CREATE POLICY "Users can delete own project characters"
  ON project_characters
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = project_characters.project_id
      AND projects.user_id = auth.uid()
    )
  );

-- Add helpful comment
COMMENT ON TABLE project_characters IS 'Character definitions for Ask Doooda dialogue injection system. Each character belongs to a project and has a unique dialogue_name for injection.';
COMMENT ON COLUMN project_characters.name IS 'Internal character name displayed in UI';
COMMENT ON COLUMN project_characters.dialogue_name IS 'Unique name used for @character injection in Ask Doooda prompts';
COMMENT ON COLUMN project_characters.description IS 'General character description';
COMMENT ON COLUMN project_characters.personality_traits IS 'Character personality and traits';
COMMENT ON COLUMN project_characters.background IS 'Character backstory and history';
COMMENT ON COLUMN project_characters.speaking_style IS 'How the character speaks and communicates';
COMMENT ON COLUMN project_characters.goals IS 'Character motivations and goals';
COMMENT ON COLUMN project_characters.fears IS 'Character fears and weaknesses';
