ALTER TABLE project_collaborators ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users can see their collaborations"
ON project_collaborators FOR SELECT
TO authenticated
USING (
  user_id = auth.uid()
  OR
  project_id IN (
    SELECT id FROM projects WHERE user_id = auth.uid()
  )
);

CREATE POLICY "owner can manage collaborators"
ON project_collaborators FOR INSERT
TO authenticated
WITH CHECK (
  project_id IN (
    SELECT id FROM projects WHERE user_id = auth.uid()
  )
  OR
  invited_by = auth.uid()
);

CREATE POLICY "owner or manager can update collaborators"
ON project_collaborators FOR UPDATE
TO authenticated
USING (
  project_id IN (
    SELECT id FROM projects WHERE user_id = auth.uid()
  )
  OR
  project_id IN (
    SELECT pc.project_id FROM project_collaborators pc
    WHERE pc.user_id = auth.uid() AND pc.status = 'active' AND pc.role = 'manager'
  )
);

CREATE POLICY "owner can delete collaborators"
ON project_collaborators FOR DELETE
TO authenticated
USING (
  project_id IN (
    SELECT id FROM projects WHERE user_id = auth.uid()
  )
);
