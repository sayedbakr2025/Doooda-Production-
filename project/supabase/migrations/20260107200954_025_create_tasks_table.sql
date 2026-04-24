/*
  # Create Tasks (To-Do List) Table

  1. New Tables
    - `tasks`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references users) - task owner
      - `project_id` (uuid, references projects) - associated project
      - `chapter_number` (integer, nullable) - which chapter if applicable
      - `scene_number` (integer, nullable) - which scene if applicable
      - `context_type` (text) - where task was created: 'logline', 'chapter_summary', 'scene_summary', 'scene_content'
      - `description` (text) - task description
      - `completed` (boolean, default false) - completion status
      - `created_at` (timestamptz, default now())
      - `updated_at` (timestamptz, default now())
      - `deleted_at` (timestamptz, nullable) - soft delete

  2. Security
    - Enable RLS on `tasks` table
    - Writers can only view their own tasks
    - Writers can create tasks for their own projects
    - Writers can update their own tasks
    - Writers can soft-delete their own tasks

  3. Indexes
    - Index on (user_id, project_id, deleted_at) for task list queries
    - Index on (project_id, created_at) for ordering
    - Index on (completed) for progress calculations

  4. Important Notes
    - chapter_number and scene_number are nullable (logline tasks have neither)
    - context_type helps identify where task was created from
    - Tasks ordered by created_at (oldest first) on task list page
    - completed flag updated via save button only (no autosave)
    - Soft delete preserves task history
*/

CREATE TABLE IF NOT EXISTS tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  chapter_number integer CHECK (chapter_number > 0),
  scene_number integer CHECK (scene_number > 0),
  context_type text NOT NULL CHECK (context_type IN ('logline', 'chapter_summary', 'scene_summary', 'scene_content')),
  description text NOT NULL CHECK (length(description) > 0),
  completed boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  deleted_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_tasks_user_project ON tasks(user_id, project_id, deleted_at);
CREATE INDEX IF NOT EXISTS idx_tasks_project_created ON tasks(project_id, created_at);
CREATE INDEX IF NOT EXISTS idx_tasks_completed ON tasks(completed);

ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Writers can view own tasks"
  ON tasks FOR SELECT
  TO authenticated
  USING (user_id = auth.uid() AND deleted_at IS NULL);

CREATE POLICY "Writers can create tasks"
  ON tasks FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = tasks.project_id
      AND projects.user_id = auth.uid()
      AND projects.deleted_at IS NULL
    )
  );

CREATE POLICY "Writers can update own tasks"
  ON tasks FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid() AND deleted_at IS NULL)
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Writers can soft-delete own tasks"
  ON tasks FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE OR REPLACE FUNCTION update_task_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tasks_updated_at
  BEFORE UPDATE ON tasks
  FOR EACH ROW
  EXECUTE FUNCTION update_task_timestamp();

COMMENT ON TABLE tasks IS 'To-do list items created from project context areas';
COMMENT ON COLUMN tasks.context_type IS 'Where task was created: logline, chapter_summary, scene_summary, scene_content';
COMMENT ON COLUMN tasks.chapter_number IS 'Chapter number if task created from chapter context';
COMMENT ON COLUMN tasks.scene_number IS 'Scene number if task created from scene context';
