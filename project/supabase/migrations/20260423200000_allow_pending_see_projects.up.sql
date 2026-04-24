CREATE OR REPLACE FUNCTION public.has_project_access(p_project_id uuid, p_user_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.projects WHERE id = p_project_id AND user_id = p_user_id
    UNION ALL
    SELECT 1 FROM public.project_collaborators WHERE project_id = p_project_id AND user_id = p_user_id AND status IN ('active', 'pending')
  );
$$;
