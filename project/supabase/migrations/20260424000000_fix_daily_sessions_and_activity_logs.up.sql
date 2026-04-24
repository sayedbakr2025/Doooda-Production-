-- 1. Make project_id nullable in daily_writing_sessions
ALTER TABLE daily_writing_sessions ALTER COLUMN project_id DROP NOT NULL;

-- Drop old unique index that includes project_id
DROP INDEX IF EXISTS idx_sessions_unique_day;

-- Create new unique index on (user_id, session_date) only
CREATE UNIQUE INDEX IF NOT EXISTS idx_sessions_user_date_unique
  ON daily_writing_sessions(user_id, session_date);

-- 2. Create activity_logs table
CREATE TABLE IF NOT EXISTS activity_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  action text NOT NULL,
  entity_type text NOT NULL,
  entity_id uuid,
  entity_title text NOT NULL DEFAULT '',
  meta jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_activity_logs_project ON activity_logs(project_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_user ON activity_logs(user_id);

ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Project members can read activity logs"
  ON activity_logs FOR SELECT
  TO authenticated
  USING (
    project_id IN (
      SELECT p.id FROM projects p WHERE p.user_id = auth.uid()
      UNION
      SELECT pc.project_id FROM project_collaborators pc WHERE pc.user_id = auth.uid() AND pc.status = 'active'
    )
  );

CREATE POLICY "Authenticated can insert activity logs"
  ON activity_logs FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());