-- ============================================================
-- NUCLEAR FIX: Drop ALL policies on idea_banks and recreate
-- using the simplest possible approach that cannot fail.
--
-- Root cause analysis:
--   The INSERT WITH CHECK policy uses subqueries or functions
--   that either (a) trigger RLS on other tables or (b) have
--   a dependency on idea_banks itself via resolve_idea_bank_role.
--
-- Strategy: 
--   - DROP every policy on idea_banks regardless of name
--   - Recreate INSERT using direct auth.uid() lookup via
--     a NEW function get_project_owner_id() that is pure
--     SECURITY DEFINER with no circular deps
-- ============================================================

-- Step 1: Drop ALL existing policies on idea_banks (by name and dynamically)
DO $$
DECLARE
  pol record;
BEGIN
  FOR pol IN
    SELECT policyname FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'idea_banks'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.idea_banks', pol.policyname);
  END LOOP;
END $$;

-- Step 2: Create a bullet-proof helper function
-- This function checks if a given user is the owner of a project.
-- It uses SECURITY DEFINER to bypass RLS on `projects` entirely.
-- It is completely self-contained with no deps on idea_banks.
CREATE OR REPLACE FUNCTION public.user_owns_project(p_project_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.projects
    WHERE id = p_project_id
      AND user_id = auth.uid()
      AND deleted_at IS NULL
  );
$$;

-- Step 3: Recreate all idea_banks policies cleanly

-- SELECT: use resolve_idea_bank_role (already SECURITY DEFINER)
CREATE POLICY "idea_banks_select"
  ON public.idea_banks
  FOR SELECT
  TO authenticated
  USING (
    resolve_idea_bank_role(id, auth.uid()) IS NOT NULL
  );

-- INSERT: project owner only — uses bullet-proof helper, no subquery loops
CREATE POLICY "idea_banks_insert"
  ON public.idea_banks
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.user_owns_project(project_id)
  );

-- UPDATE: project owner only
CREATE POLICY "idea_banks_update"
  ON public.idea_banks
  FOR UPDATE
  TO authenticated
  USING (
    public.user_owns_project(project_id)
  )
  WITH CHECK (
    public.user_owns_project(project_id)
  );

-- DELETE: not allowed by default (cascade handles it from projects)
-- No DELETE policy needed as cascade from projects handles cleanup
