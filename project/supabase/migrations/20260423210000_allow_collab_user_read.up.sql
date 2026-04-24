CREATE POLICY "users can see collaborators in their projects"
ON users FOR SELECT
TO authenticated
USING (
  id = auth.uid()
  OR
  EXISTS (
    SELECT 1 FROM public.project_collaborators pc
    JOIN public.projects p ON p.id = pc.project_id
    WHERE pc.user_id = users.id
    AND (
      p.user_id = auth.uid()
      OR
      EXISTS (
        SELECT 1 FROM public.project_collaborators pc2
        WHERE pc2.project_id = pc.project_id
        AND pc2.user_id = auth.uid()
        AND pc2.status = 'active'
      )
    )
    AND pc.status = 'active'
  )
);
