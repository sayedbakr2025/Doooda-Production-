-- Create get_collaborator_display_names function (referenced in api.ts but was missing)
-- Also fix general comments author display

CREATE OR REPLACE FUNCTION public.get_collaborator_display_names(user_ids uuid[])
RETURNS TABLE(id uuid, display_name text, email text)
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT
    u.id,
    COALESCE(NULLIF(u.pen_name, ''), NULLIF(u.first_name, ''), split_part(u.email, '@', 1)) AS display_name,
    u.email
  FROM public.users u
  WHERE u.id = ANY(user_ids);
$$;

-- Also create a helper for SceneComments author names
-- getSceneComments uses direct query on users table with raw_user_meta_data
-- which may not exist, so we add a view-friendly approach
CREATE OR REPLACE FUNCTION public.get_comment_authors(p_scene_id uuid)
RETURNS TABLE(
  comment_id uuid,
  author_name text
)
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT
    c.id AS comment_id,
    COALESCE(NULLIF(u.pen_name, ''), NULLIF(u.first_name, ''), split_part(u.email, '@', 1)) AS author_name
  FROM comments c
  JOIN public.users u ON u.id = c.user_id
  WHERE c.scene_id = p_scene_id AND c.deleted_at IS NULL;
$$;