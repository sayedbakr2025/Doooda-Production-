CREATE POLICY "viewers can only select chapters"
ON chapters FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "editors can update text in chapters"
ON chapters FOR UPDATE
TO authenticated
USING (
  project_id IN (
    SELECT pc.project_id FROM project_collaborators pc
    WHERE pc.user_id = auth.uid() AND pc.status = 'active'
    AND pc.role IN ('editor', 'manager')
  ) OR project_id IN (SELECT id FROM projects WHERE user_id = auth.uid())
);

CREATE POLICY "editors can update text in scenes"
ON scenes FOR UPDATE
TO authenticated
USING (
  chapter_id IN (
    SELECT c.id FROM chapters c WHERE c.project_id IN (
      SELECT pc.project_id FROM project_collaborators pc
      WHERE pc.user_id = auth.uid() AND pc.status = 'active'
      AND pc.role IN ('editor', 'manager')
    ) OR c.project_id IN (SELECT id FROM projects WHERE user_id = auth.uid())
  )
);

CREATE POLICY "managers can insert chapters"
ON chapters FOR INSERT
TO authenticated
WITH CHECK (
  project_id IN (
    SELECT pc.project_id FROM project_collaborators pc
    WHERE pc.user_id = auth.uid() AND pc.status = 'active'
    AND pc.role IN ('editor', 'manager')
  ) OR project_id IN (SELECT id FROM projects WHERE user_id = auth.uid())
);

CREATE POLICY "managers can delete chapters"
ON chapters FOR DELETE
TO authenticated
USING (
  project_id IN (
    SELECT pc.project_id FROM project_collaborators pc
    WHERE pc.user_id = auth.uid() AND pc.status = 'active'
    AND pc.role = 'manager'
  ) OR project_id IN (SELECT id FROM projects WHERE user_id = auth.uid())
);

CREATE POLICY "managers can insert scenes"
ON scenes FOR INSERT
TO authenticated
WITH CHECK (
  chapter_id IN (
    SELECT c.id FROM chapters c WHERE c.project_id IN (
      SELECT pc.project_id FROM project_collaborators pc
      WHERE pc.user_id = auth.uid() AND pc.status = 'active'
      AND pc.role IN ('editor', 'manager')
    ) OR c.project_id IN (SELECT id FROM projects WHERE user_id = auth.uid())
  )
);

CREATE POLICY "managers can delete scenes"
ON scenes FOR DELETE
TO authenticated
USING (
  chapter_id IN (
    SELECT c.id FROM chapters c WHERE c.project_id IN (
      SELECT pc.project_id FROM project_collaborators pc
      WHERE pc.user_id = auth.uid() AND pc.status = 'active'
      AND pc.role = 'manager'
    ) OR c.project_id IN (SELECT id FROM projects WHERE user_id = auth.uid())
  )
);

CREATE POLICY "editors can manage characters"
ON characters FOR ALL
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
