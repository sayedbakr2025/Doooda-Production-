-- Create comments table (general scene comments, NOT inline_comments)
-- This was missing from migrations but referenced in application code

CREATE TABLE IF NOT EXISTS comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  scene_id uuid NOT NULL REFERENCES scenes(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  parent_id uuid REFERENCES comments(id) ON DELETE CASCADE,
  content text NOT NULL,
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'resolved')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_comments_scene ON comments(scene_id);
CREATE INDEX IF NOT EXISTS idx_comments_project ON comments(project_id);
CREATE INDEX IF NOT EXISTS idx_comments_user ON comments(user_id);
CREATE INDEX IF NOT EXISTS idx_comments_parent ON comments(parent_id) WHERE parent_id IS NOT NULL;

ALTER TABLE comments ENABLE ROW LEVEL SECURITY;

-- Anyone who can see the project can view comments
CREATE POLICY "Collaborators and owners can view comments" ON comments
  FOR SELECT USING (
    project_id IN (
      SELECT p.id FROM projects p WHERE p.user_id = auth.uid()
      UNION
      SELECT pc.project_id FROM project_collaborators pc
      WHERE pc.user_id = auth.uid() AND pc.status = 'active'
    )
  );

-- Collaborators and owners can insert comments
CREATE POLICY "Collaborators and owners can insert comments" ON comments
  FOR INSERT WITH CHECK (
    user_id = auth.uid() AND (
      project_id IN (
        SELECT p.id FROM projects p WHERE p.user_id = auth.uid()
        UNION
        SELECT pc.project_id FROM project_collaborators pc
        WHERE pc.user_id = auth.uid() AND pc.status = 'active'
      )
    )
  );

-- Comment author or project owner can update status (resolve/reopen)
CREATE POLICY "Comment author or project owner can update" ON comments
  FOR UPDATE USING (
    user_id = auth.uid() OR
    project_id IN (SELECT p.id FROM projects p WHERE p.user_id = auth.uid())
  );

-- Comment author or project owner can soft-delete
CREATE POLICY "Comment author or project owner can delete" ON comments
  FOR UPDATE USING (
    user_id = auth.uid() OR
    project_id IN (SELECT p.id FROM projects p WHERE p.user_id = auth.uid())
  ) WITH CHECK (true);

-- Allow actual DELETE only for project owner
CREATE POLICY "Only project owner can hard delete" ON comments
  FOR DELETE USING (
    project_id IN (SELECT p.id FROM projects p WHERE p.user_id = auth.uid())
  );