-- ============================================================
-- Fix: RLS INSERT/UPDATE/DELETE policies fail because subqueries
-- on projects/project_collaborators are subject to those tables' RLS.
--
-- Solution: All mutation policies now use SECURITY DEFINER helper
-- functions (is_project_owner, is_project_editor) that bypass RLS.
-- SELECT policies continue to use resolve_idea_bank_role() (also
-- SECURITY DEFINER).
--
-- Policy diff:
-- idea_banks INSERT:  was subquery on projects → now is_project_owner()
-- idea_banks UPDATE:   was subquery on projects → now is_project_owner()
-- idea_slots INSERT/UPDATE/DELETE: was subquery on projects → now is_project_editor()
-- idea_cards INSERT/UPDATE/DELETE: was subquery on projects → now is_project_editor()
-- idea_polls INSERT/UPDATE/DELETE: was subquery on projects → now is_project_editor()
-- idea_bank_collaborators ALL: was subquery → now is_project_editor()
-- idea_bank_imports SELECT: was resolve_idea_bank_role → now is_project_owner()
-- ============================================================

-- Ensure helper functions exist (idempotent CREATE OR REPLACE)
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

CREATE OR REPLACE FUNCTION is_project_owner(p_project_id UUID, p_user_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM projects WHERE id = p_project_id AND user_id = p_user_id AND deleted_at IS NULL
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public;

-- ============================================================
-- idea_banks
-- ============================================================
DROP POLICY IF EXISTS idea_banks_insert ON idea_banks;
DROP POLICY IF EXISTS idea_banks_update ON idea_banks;

CREATE POLICY "idea_banks_insert" ON idea_banks
  FOR INSERT WITH CHECK (
    is_project_owner(project_id, auth.uid())
  );

CREATE POLICY "idea_banks_update" ON idea_banks
  FOR UPDATE USING (
    is_project_owner(project_id, auth.uid())
  );

-- ============================================================
-- idea_slots
-- ============================================================
DROP POLICY IF EXISTS idea_slots_insert ON idea_slots;
DROP POLICY IF EXISTS idea_slots_update ON idea_slots;
DROP POLICY IF EXISTS idea_slots_delete ON idea_slots;

CREATE POLICY "idea_slots_insert" ON idea_slots
  FOR INSERT WITH CHECK (
    is_project_editor(
      (SELECT project_id FROM idea_banks WHERE id = idea_slots.idea_bank_id),
      auth.uid()
    )
  );

CREATE POLICY "idea_slots_update" ON idea_slots
  FOR UPDATE USING (
    is_project_editor(
      (SELECT project_id FROM idea_banks WHERE id = idea_slots.idea_bank_id),
      auth.uid()
    )
  );

CREATE POLICY "idea_slots_delete" ON idea_slots
  FOR DELETE USING (
    is_project_editor(
      (SELECT project_id FROM idea_banks WHERE id = idea_slots.idea_bank_id),
      auth.uid()
    )
  );

-- ============================================================
-- idea_cards
-- ============================================================
DROP POLICY IF EXISTS idea_cards_insert ON idea_cards;
DROP POLICY IF EXISTS idea_cards_update ON idea_cards;
DROP POLICY IF EXISTS idea_cards_delete ON idea_cards;

CREATE POLICY "idea_cards_insert" ON idea_cards
  FOR INSERT WITH CHECK (
    is_project_editor(
      (SELECT ib.project_id FROM idea_banks ib JOIN idea_slots is2 ON ib.id = is2.idea_bank_id WHERE is2.id = idea_cards.slot_id),
      auth.uid()
    )
  );

CREATE POLICY "idea_cards_update" ON idea_cards
  FOR UPDATE USING (
    is_project_editor(
      (SELECT ib.project_id FROM idea_banks ib JOIN idea_slots is2 ON ib.id = is2.idea_bank_id WHERE is2.id = idea_cards.slot_id),
      auth.uid()
    )
  );

CREATE POLICY "idea_cards_delete" ON idea_cards
  FOR DELETE USING (
    is_project_editor(
      (SELECT ib.project_id FROM idea_banks ib JOIN idea_slots is2 ON ib.id = is2.idea_bank_id WHERE is2.id = idea_cards.slot_id),
      auth.uid()
    )
  );

-- ============================================================
-- idea_polls
-- ============================================================
DROP POLICY IF EXISTS idea_polls_insert ON idea_polls;
DROP POLICY IF EXISTS idea_polls_update ON idea_polls;
DROP POLICY IF EXISTS idea_polls_delete ON idea_polls;

CREATE POLICY "idea_polls_insert" ON idea_polls
  FOR INSERT WITH CHECK (
    is_project_editor(
      (SELECT ib.project_id FROM idea_banks ib JOIN idea_slots is2 ON ib.id = is2.idea_bank_id WHERE is2.id = idea_polls.slot_id),
      auth.uid()
    )
  );

CREATE POLICY "idea_polls_update" ON idea_polls
  FOR UPDATE USING (
    is_project_editor(
      (SELECT ib.project_id FROM idea_banks ib JOIN idea_slots is2 ON ib.id = is2.idea_bank_id WHERE is2.id = idea_polls.slot_id),
      auth.uid()
    )
  );

CREATE POLICY "idea_polls_delete" ON idea_polls
  FOR DELETE USING (
    is_project_editor(
      (SELECT ib.project_id FROM idea_banks ib JOIN idea_slots is2 ON ib.id = is2.idea_bank_id WHERE is2.id = idea_polls.slot_id),
      auth.uid()
    )
  );

-- ============================================================
-- idea_bank_collaborators
-- ============================================================
DROP POLICY IF EXISTS idea_bank_collabs_modify ON idea_bank_collaborators;

CREATE POLICY "idea_bank_collabs_modify" ON idea_bank_collaborators
  FOR ALL USING (
    is_project_editor(
      (SELECT project_id FROM idea_banks WHERE id = idea_bank_collaborators.idea_bank_id),
      auth.uid()
    )
  );

-- ============================================================
-- idea_bank_imports
-- ============================================================
DROP POLICY IF EXISTS idea_bank_imports_select ON idea_bank_imports;

CREATE POLICY "idea_bank_imports_select" ON idea_bank_imports
  FOR SELECT USING (
    is_project_owner(
      (SELECT project_id FROM idea_banks WHERE id = idea_bank_imports.idea_bank_id),
      auth.uid()
    )
  );