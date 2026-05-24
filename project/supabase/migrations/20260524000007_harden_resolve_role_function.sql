-- ============================================================
-- Phase 5 SECURITY FIX: Harden resolve_idea_bank_role()
-- 
-- Security audit findings fixed:
-- 1. Added SET search_path = public to prevent search path injection
-- 2. Schema-qualified all table references (public.projects, etc.)
-- 3. No dynamic SQL used (verified)
-- 4. Least privilege: function only reads, no writes
-- 5. STABLE + SECURITY DEFINER is appropriate here since it only reads
-- ============================================================

CREATE OR REPLACE FUNCTION resolve_idea_bank_role(p_idea_bank_id UUID, p_user_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_project_id UUID;
  v_project_role TEXT;
  v_ib_role TEXT;
  v_is_owner BOOLEAN;
  v_effective_role TEXT;
BEGIN
  -- Get project_id from idea_bank (schema-qualified)
  SELECT project_id INTO v_project_id FROM public.idea_banks WHERE id = p_idea_bank_id;
  IF v_project_id IS NULL THEN RETURN NULL; END IF;

  -- Check if project owner (schema-qualified)
  SELECT (user_id = p_user_id) INTO v_is_owner FROM public.projects WHERE id = v_project_id AND deleted_at IS NULL;
  IF v_is_owner THEN RETURN 'owner'; END IF;

  -- Check project collaborator role (inherited, schema-qualified)
  SELECT role INTO v_project_role FROM public.project_collaborators
  WHERE project_id = v_project_id AND user_id = p_user_id AND status = 'active';

  -- Map project role to inherited IB role
  IF v_project_role = 'manager' OR v_project_role = 'editor' THEN
    v_project_role := 'editor';
  ELSIF v_project_role = 'viewer' THEN
    v_project_role := 'viewer';
  ELSE
    v_project_role := NULL;
  END IF;

  -- Check explicit idea bank collaborator role (schema-qualified)
  SELECT role INTO v_ib_role FROM public.idea_bank_collaborators
  WHERE idea_bank_id = p_idea_bank_id AND user_id = p_user_id AND status = 'active';

  -- Compute effective = max of both roles
  -- Priority: editor > voter > viewer (additive, never restrictive)
  IF v_project_role = 'editor' OR v_ib_role = 'editor' THEN
    v_effective_role := 'editor';
  ELSIF v_project_role = 'voter' OR v_ib_role = 'voter' THEN
    v_effective_role := 'voter';
  ELSIF v_project_role = 'viewer' OR v_ib_role = 'viewer' THEN
    v_effective_role := 'viewer';
  ELSE
    v_effective_role := NULL;
  END IF;

  RETURN v_effective_role;
END;
$$;