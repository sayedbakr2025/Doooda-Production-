CREATE OR REPLACE FUNCTION public.get_collaborator_names(p_user_ids uuid[])
RETURNS TABLE(id uuid, pen_name text, email text)
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT
    u.id,
    COALESCE(NULLIF(u.pen_name, ''), NULLIF(u.first_name, ''), split_part(u.email, '@', 1)) AS pen_name,
    u.email
  FROM public.users u
  WHERE u.id = ANY(p_user_ids);
$$;
