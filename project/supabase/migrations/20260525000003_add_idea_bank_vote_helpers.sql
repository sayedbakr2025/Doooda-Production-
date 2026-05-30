-- Migration: Add functions for Idea Bank vote aggregation and voter details

-- 1. Function to get distinct eligible voter count for an idea bank
CREATE OR REPLACE FUNCTION public.get_idea_bank_eligible_voters_count(p_idea_bank_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_project_id uuid;
  v_owner_id uuid;
  v_count integer;
BEGIN
  -- Get project_id
  SELECT project_id INTO v_project_id FROM public.idea_banks WHERE id = p_idea_bank_id;
  IF v_project_id IS NULL THEN
    RETURN 1;
  END IF;

  -- Get project owner
  SELECT user_id INTO v_owner_id FROM public.projects WHERE id = v_project_id AND deleted_at IS NULL;

  -- Count distinct users who have access
  SELECT COUNT(DISTINCT user_id) INTO v_count
  FROM (
    SELECT v_owner_id AS user_id WHERE v_owner_id IS NOT NULL
    UNION
    SELECT user_id FROM public.project_collaborators WHERE project_id = v_project_id AND status = 'active'
    UNION
    SELECT user_id FROM public.idea_bank_collaborators WHERE idea_bank_id = p_idea_bank_id AND status = 'active'
  ) sub;

  RETURN COALESCE(v_count, 1);
END;
$$;

-- 2. Function to get voters with display names for specified polls
CREATE OR REPLACE FUNCTION public.get_idea_bank_votes_with_voters(p_poll_ids uuid[])
RETURNS TABLE(
  poll_id uuid,
  idea_card_id uuid,
  user_id uuid,
  voter_name text
)
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT
    iv.poll_id,
    iv.idea_card_id,
    iv.user_id,
    COALESCE(NULLIF(u.pen_name, ''), NULLIF(u.first_name, ''), split_part(u.email, '@', 1)) AS voter_name
  FROM public.idea_votes iv
  JOIN public.users u ON u.id = iv.user_id
  WHERE iv.poll_id = ANY(p_poll_ids);
$$;
