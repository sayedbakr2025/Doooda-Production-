DO $$ BEGIN
  DECLARE
    pol record;
  BEGIN
    FOR pol IN
      SELECT policyname, tablename
      FROM pg_policies
      WHERE schemaname = 'public'
        AND tablename IN ('projects', 'project_collaborators', 'chapters', 'scenes', 'project_characters', 'book_references', 'tasks', 'notifications', 'project_activity')
    LOOP
      EXECUTE format('DROP POLICY IF EXISTS %I ON %I', pol.policyname, pol.tablename);
    END LOOP;
  END;
END $$;

ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_collaborators ENABLE ROW LEVEL SECURITY;
ALTER TABLE chapters ENABLE ROW LEVEL SECURITY;
ALTER TABLE scenes ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_characters ENABLE ROW LEVEL SECURITY;
ALTER TABLE book_references ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_activity ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_project_access(p_project_id uuid, p_user_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.projects WHERE id = p_project_id AND user_id = p_user_id
    UNION ALL
    SELECT 1 FROM public.project_collaborators WHERE project_id = p_project_id AND user_id = p_user_id AND status = 'active'
  );
$$;

CREATE OR REPLACE FUNCTION public.get_project_role(p_project_id uuid, p_user_id uuid)
RETURNS text
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT COALESCE(
    (SELECT 'owner' FROM public.projects WHERE id = p_project_id AND user_id = p_user_id),
    (SELECT role FROM public.project_collaborators WHERE project_id = p_project_id AND user_id = p_user_id AND status = 'active'),
    'none'
  );
$$;

CREATE POLICY "users can see accessible projects"
ON projects FOR SELECT
TO authenticated
USING (has_project_access(id, auth.uid()));

CREATE POLICY "users can create projects"
ON projects FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

CREATE POLICY "owner can update projects"
ON projects FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

CREATE POLICY "owner can delete projects"
ON projects FOR DELETE
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "users can see own collaborations"
ON project_collaborators FOR SELECT
TO authenticated
USING (user_id = auth.uid() OR has_project_access(project_id, auth.uid()));

CREATE POLICY "authenticated can insert collaborations"
ON project_collaborators FOR INSERT
TO authenticated
WITH CHECK (invited_by = auth.uid() OR user_id = auth.uid());

CREATE POLICY "users can update own collaboration status"
ON project_collaborators FOR UPDATE
TO authenticated
USING (invited_by = auth.uid() OR user_id = auth.uid());

CREATE POLICY "inviter can delete collaborations"
ON project_collaborators FOR DELETE
TO authenticated
USING (invited_by = auth.uid() OR user_id = auth.uid());

CREATE POLICY "users can read own notifications"
ON notifications FOR SELECT
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "authenticated can insert notifications"
ON notifications FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "users can update own notifications"
ON notifications FOR UPDATE
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "project members can read activity"
ON project_activity FOR SELECT
TO authenticated
USING (has_project_access(project_id, auth.uid()) OR user_id = auth.uid());

CREATE POLICY "authenticated can insert activity"
ON project_activity FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "project members can read chapters"
ON chapters FOR SELECT
TO authenticated
USING (has_project_access(project_id, auth.uid()));

CREATE POLICY "editors can insert chapters"
ON chapters FOR INSERT
TO authenticated
WITH CHECK (get_project_role(project_id, auth.uid()) IN ('owner', 'editor', 'manager'));

CREATE POLICY "editors can update chapters"
ON chapters FOR UPDATE
TO authenticated
USING (get_project_role(project_id, auth.uid()) IN ('owner', 'editor', 'manager'));

CREATE POLICY "managers can delete chapters"
ON chapters FOR DELETE
TO authenticated
USING (get_project_role(project_id, auth.uid()) IN ('owner', 'manager'));

CREATE POLICY "project members can read scenes"
ON scenes FOR SELECT
TO authenticated
USING (EXISTS (SELECT 1 FROM chapters c WHERE c.id = scenes.chapter_id AND has_project_access(c.project_id, auth.uid())));

CREATE POLICY "editors can insert scenes"
ON scenes FOR INSERT
TO authenticated
WITH CHECK (EXISTS (SELECT 1 FROM chapters c WHERE c.id = scenes.chapter_id AND get_project_role(c.project_id, auth.uid()) IN ('owner', 'editor', 'manager')));

CREATE POLICY "editors can update scenes"
ON scenes FOR UPDATE
TO authenticated
USING (EXISTS (SELECT 1 FROM chapters c WHERE c.id = scenes.chapter_id AND get_project_role(c.project_id, auth.uid()) IN ('owner', 'editor', 'manager')));

CREATE POLICY "managers can delete scenes"
ON scenes FOR DELETE
TO authenticated
USING (EXISTS (SELECT 1 FROM chapters c WHERE c.id = scenes.chapter_id AND get_project_role(c.project_id, auth.uid()) IN ('owner', 'manager')));

CREATE POLICY "project members can read characters"
ON project_characters FOR SELECT
TO authenticated
USING (has_project_access(project_id, auth.uid()));

CREATE POLICY "editors can insert characters"
ON project_characters FOR INSERT
TO authenticated
WITH CHECK (get_project_role(project_id, auth.uid()) IN ('owner', 'editor', 'manager'));

CREATE POLICY "editors can update characters"
ON project_characters FOR UPDATE
TO authenticated
USING (get_project_role(project_id, auth.uid()) IN ('owner', 'editor', 'manager'));

CREATE POLICY "managers can delete characters"
ON project_characters FOR DELETE
TO authenticated
USING (get_project_role(project_id, auth.uid()) IN ('owner', 'manager'));

CREATE POLICY "project members can read references"
ON book_references FOR SELECT
TO authenticated
USING (has_project_access(project_id, auth.uid()));

CREATE POLICY "editors can insert references"
ON book_references FOR INSERT
TO authenticated
WITH CHECK (get_project_role(project_id, auth.uid()) IN ('owner', 'editor', 'manager'));

CREATE POLICY "editors can update references"
ON book_references FOR UPDATE
TO authenticated
USING (get_project_role(project_id, auth.uid()) IN ('owner', 'editor', 'manager'));

CREATE POLICY "managers can delete references"
ON book_references FOR DELETE
TO authenticated
USING (get_project_role(project_id, auth.uid()) IN ('owner', 'manager'));

CREATE POLICY "project members can read tasks"
ON tasks FOR SELECT
TO authenticated
USING (has_project_access(project_id, auth.uid()));

CREATE POLICY "managers can insert tasks"
ON tasks FOR INSERT
TO authenticated
WITH CHECK (get_project_role(project_id, auth.uid()) IN ('owner', 'manager'));

CREATE POLICY "managers can update tasks"
ON tasks FOR UPDATE
TO authenticated
USING (get_project_role(project_id, auth.uid()) IN ('owner', 'manager'));

CREATE POLICY "managers can delete tasks"
ON tasks FOR DELETE
TO authenticated
USING (get_project_role(project_id, auth.uid()) IN ('owner', 'manager'));
