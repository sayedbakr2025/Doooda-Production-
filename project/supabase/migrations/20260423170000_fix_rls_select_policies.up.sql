CREATE POLICY "anyone can select chapters"
ON chapters FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "anyone can select scenes"
ON scenes FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "owner or collaborator can select characters"
ON project_characters FOR SELECT
TO authenticated
USING (
  project_id IN (
    SELECT id FROM projects WHERE user_id = auth.uid()
  )
  OR
  project_id IN (
    SELECT pc.project_id FROM project_collaborators pc
    WHERE pc.user_id = auth.uid() AND pc.status = 'active'
  )
);

CREATE POLICY "editors can insert characters"
ON project_characters FOR INSERT
TO authenticated
WITH CHECK (
  project_id IN (
    SELECT pc.project_id FROM project_collaborators pc
    WHERE pc.user_id = auth.uid() AND pc.status = 'active'
    AND pc.role IN ('editor', 'manager')
  ) OR project_id IN (SELECT id FROM projects WHERE user_id = auth.uid())
);

CREATE POLICY "editors can update characters"
ON project_characters FOR UPDATE
TO authenticated
USING (
  project_id IN (
    SELECT pc.project_id FROM project_collaborators pc
    WHERE pc.user_id = auth.uid() AND pc.status = 'active'
    AND pc.role IN ('editor', 'manager')
  ) OR project_id IN (SELECT id FROM projects WHERE user_id = auth.uid())
)
WITH CHECK (
  project_id IN (
    SELECT pc.project_id FROM project_collaborators pc
    WHERE pc.user_id = auth.uid() AND pc.status = 'active'
    AND pc.role IN ('editor', 'manager')
  ) OR project_id IN (SELECT id FROM projects WHERE user_id = auth.uid())
);

CREATE POLICY "managers can delete characters"
ON project_characters FOR DELETE
TO authenticated
USING (
  project_id IN (
    SELECT pc.project_id FROM project_collaborators pc
    WHERE pc.user_id = auth.uid() AND pc.status = 'active'
    AND pc.role = 'manager'
  ) OR project_id IN (SELECT id FROM projects WHERE user_id = auth.uid())
);

CREATE POLICY "owner or collaborator can select references"
ON book_references FOR SELECT
TO authenticated
USING (
  project_id IN (
    SELECT id FROM projects WHERE user_id = auth.uid()
  )
  OR
  project_id IN (
    SELECT pc.project_id FROM project_collaborators pc
    WHERE pc.user_id = auth.uid() AND pc.status = 'active'
  )
);

CREATE POLICY "owner or collaborator can select tasks"
ON tasks FOR SELECT
TO authenticated
USING (
  project_id IN (
    SELECT id FROM projects WHERE user_id = auth.uid()
  )
  OR
  project_id IN (
    SELECT pc.project_id FROM project_collaborators pc
    WHERE pc.user_id = auth.uid() AND pc.status = 'active'
  )
);
