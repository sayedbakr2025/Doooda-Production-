-- ============================================================
-- Fix: idea_banks INSERT RLS policy fails with error 42501.
--
-- Root cause: The INSERT WITH CHECK policy uses a subquery on
-- the `projects` table which itself has RLS enabled. In some
-- execution paths the RLS on `projects` blocks the subquery,
-- causing the policy to return false for legitimate project owners.
--
-- Fix: Use a SECURITY DEFINER function (is_project_owner) that
-- bypasses RLS when checking project ownership, ensuring the
-- INSERT policy works correctly for all authenticated users who
-- own the project.
--
-- Also ensure all mutation policies are consistent and correct.
-- ============================================================

-- Make sure SECURITY DEFINER helpers exist and are correct
CREATE OR REPLACE FUNCTION is_project_owner(p_project_id UUID, p_user_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM projects WHERE id = p_project_id AND user_id = p_user_id AND deleted_at IS NULL
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION is_project_member(p_project_id UUID, p_user_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM projects WHERE id = p_project_id AND user_id = p_user_id AND deleted_at IS NULL
  ) OR EXISTS (
    SELECT 1 FROM project_collaborators
    WHERE project_id = p_project_id AND user_id = p_user_id AND status = 'active'
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION is_project_editor(p_project_id UUID, p_user_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM projects WHERE id = p_project_id AND user_id = p_user_id AND deleted_at IS NULL
  ) OR EXISTS (
    SELECT 1 FROM project_collaborators
    WHERE project_id = p_project_id AND user_id = p_user_id AND role IN ('manager', 'editor') AND status = 'active'
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public;

-- ============================================================
-- Drop and recreate idea_banks INSERT and UPDATE policies
-- using SECURITY DEFINER helper to bypass RLS on `projects`
-- ============================================================
DROP POLICY IF EXISTS idea_banks_insert ON idea_banks;
DROP POLICY IF EXISTS idea_banks_update ON idea_banks;
DROP POLICY IF EXISTS "idea_banks_insert" ON idea_banks;
DROP POLICY IF EXISTS "idea_banks_update" ON idea_banks;

-- Only the project owner can create an idea bank for a project
CREATE POLICY "idea_banks_insert" ON idea_banks
  FOR INSERT WITH CHECK (
    is_project_owner(project_id, auth.uid())
  );

-- Only the project owner can update the idea bank
CREATE POLICY "idea_banks_update" ON idea_banks
  FOR UPDATE USING (
    is_project_owner(project_id, auth.uid())
  );
