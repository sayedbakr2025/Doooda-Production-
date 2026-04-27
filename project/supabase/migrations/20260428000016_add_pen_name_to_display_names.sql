DROP FUNCTION IF EXISTS public.get_collaborator_display_names(uuid[]);

CREATE OR REPLACE FUNCTION public.get_collaborator_display_names(user_ids uuid[])
RETURNS TABLE(id uuid, display_name text, pen_name text, email text)
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT
    u.id,
    COALESCE(NULLIF(u.pen_name, ''), NULLIF(u.first_name, ''), split_part(u.email, '@', 1)) AS display_name,
    u.pen_name,
    u.email
  FROM public.users u
  WHERE u.id = ANY(user_ids);
$$;