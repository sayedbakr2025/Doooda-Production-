-- ============================================================
-- Fix: Remove all direct subqueries to projects/project_collaborators
-- from Idea Bank RLS policies and replace with SECURITY DEFINER
-- helper functions that bypass RLS (no recursion possible).
-- ============================================================

-- ============================================================
-- 1. Helper: is_project_member(project_id, user_id)
--    Returns TRUE if user is project owner or active collaborator.
--    SECURITY DEFINER = bypasses RLS on referenced tables.
-- ============================================================
CREATE OR REPLACE FUNCTION is_project_member(p_project_id UUID, p_user_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM projects WHERE id = p_project_id AND user_id = p_user_id AND deleted_at IS NULL
  ) OR EXISTS (
    SELECT 1 FROM project_collaborators
    WHERE project_id = p_project_id AND user_id = p_user_id AND status = 'active'
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public;

-- ============================================================
-- 2. Helper: is_project_editor(project_id, user_id)
--    Returns TRUE if user is project owner, manager, or editor.
-- ============================================================
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
-- 2b. Helper: is_project_owner(project_id, user_id)
--     Returns TRUE only if user IS the project owner.
-- ============================================================
CREATE OR REPLACE FUNCTION is_project_owner(p_project_id UUID, p_user_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM projects WHERE id = p_project_id AND user_id = p_user_id AND deleted_at IS NULL
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public;

-- ============================================================
-- 3. idea_banks policies
-- ============================================================
DROP POLICY IF EXISTS idea_banks_select ON idea_banks;
DROP POLICY IF EXISTS idea_banks_insert ON idea_banks;
DROP POLICY IF EXISTS idea_banks_update ON idea_banks;

CREATE POLICY "idea_banks_select" ON idea_banks
  FOR SELECT USING (
    resolve_idea_bank_role(id, auth.uid()) IS NOT NULL
  );

CREATE POLICY "idea_banks_insert" ON idea_banks
  FOR INSERT WITH CHECK (
    is_project_member(project_id, auth.uid())
  );

CREATE POLICY "idea_banks_update" ON idea_banks
  FOR UPDATE USING (
    is_project_owner(project_id, auth.uid())
  );

-- ============================================================
-- 4. idea_bank_collaborators policies (no self-reference)
-- ============================================================
DROP POLICY IF EXISTS idea_bank_collabs_select ON idea_bank_collaborators;
DROP POLICY IF EXISTS idea_bank_collabs_modify ON idea_bank_collaborators;

CREATE POLICY "idea_bank_collabs_select" ON idea_bank_collaborators
  FOR SELECT USING (
    -- Can see collaborators if you can see the bank (owner/editor/voter/viewer)
    resolve_idea_bank_role(idea_bank_id, auth.uid()) IS NOT NULL
    OR user_id = auth.uid()
  );

CREATE POLICY "idea_bank_collabs_modify" ON idea_bank_collaborators
  FOR ALL USING (
    is_project_editor(
      (SELECT project_id FROM idea_banks WHERE id = idea_bank_collaborators.idea_bank_id),
      auth.uid()
    )
  );

-- ============================================================
-- 5. idea_slots policies
-- ============================================================
DROP POLICY IF EXISTS idea_slots_select ON idea_slots;
DROP POLICY IF EXISTS idea_slots_insert ON idea_slots;
DROP POLICY IF EXISTS idea_slots_update ON idea_slots;
DROP POLICY IF EXISTS idea_slots_delete ON idea_slots;

CREATE POLICY "idea_slots_select" ON idea_slots
  FOR SELECT USING (
    resolve_idea_bank_role(idea_bank_id, auth.uid()) IS NOT NULL
  );

CREATE POLICY "idea_slots_insert" ON idea_slots
  FOR INSERT WITH CHECK (
    resolve_idea_bank_role(idea_bank_id, auth.uid()) IN ('owner', 'editor')
  );

CREATE POLICY "idea_slots_update" ON idea_slots
  FOR UPDATE USING (
    resolve_idea_bank_role(idea_bank_id, auth.uid()) IN ('owner', 'editor')
  );

CREATE POLICY "idea_slots_delete" ON idea_slots
  FOR DELETE USING (
    resolve_idea_bank_role(idea_bank_id, auth.uid()) IN ('owner', 'editor')
  );

-- ============================================================
-- 6. idea_cards policies
-- ============================================================
DROP POLICY IF EXISTS idea_cards_select ON idea_cards;
DROP POLICY IF EXISTS idea_cards_insert ON idea_cards;
DROP POLICY IF EXISTS idea_cards_update ON idea_cards;
DROP POLICY IF EXISTS idea_cards_delete ON idea_cards;

CREATE POLICY "idea_cards_select" ON idea_cards
  FOR SELECT USING (
    resolve_idea_bank_role(
      (SELECT idea_bank_id FROM idea_slots WHERE id = idea_cards.slot_id),
      auth.uid()
    ) IS NOT NULL
  );

CREATE POLICY "idea_cards_insert" ON idea_cards
  FOR INSERT WITH CHECK (
    resolve_idea_bank_role(
      (SELECT idea_bank_id FROM idea_slots WHERE id = idea_cards.slot_id),
      auth.uid()
    ) IN ('owner', 'editor')
  );

CREATE POLICY "idea_cards_update" ON idea_cards
  FOR UPDATE USING (
    resolve_idea_bank_role(
      (SELECT idea_bank_id FROM idea_slots WHERE id = idea_cards.slot_id),
      auth.uid()
    ) IN ('owner', 'editor')
  );

CREATE POLICY "idea_cards_delete" ON idea_cards
  FOR DELETE USING (
    resolve_idea_bank_role(
      (SELECT idea_bank_id FROM idea_slots WHERE id = idea_cards.slot_id),
      auth.uid()
    ) IN ('owner', 'editor')
  );

-- ============================================================
-- 7. idea_polls policies
-- ============================================================
DROP POLICY IF EXISTS idea_polls_select ON idea_polls;
DROP POLICY IF EXISTS idea_polls_insert ON idea_polls;
DROP POLICY IF EXISTS idea_polls_update ON idea_polls;
DROP POLICY IF EXISTS idea_polls_delete ON idea_polls;

CREATE POLICY "idea_polls_select" ON idea_polls
  FOR SELECT USING (
    resolve_idea_bank_role(
      (SELECT idea_bank_id FROM idea_slots WHERE id = idea_polls.slot_id),
      auth.uid()
    ) IS NOT NULL
  );

CREATE POLICY "idea_polls_insert" ON idea_polls
  FOR INSERT WITH CHECK (
    resolve_idea_bank_role(
      (SELECT idea_bank_id FROM idea_slots WHERE id = idea_polls.slot_id),
      auth.uid()
    ) IN ('owner', 'editor')
  );

CREATE POLICY "idea_polls_update" ON idea_polls
  FOR UPDATE USING (
    resolve_idea_bank_role(
      (SELECT idea_bank_id FROM idea_slots WHERE id = idea_polls.slot_id),
      auth.uid()
    ) IN ('owner', 'editor')
  );

CREATE POLICY "idea_polls_delete" ON idea_polls
  FOR DELETE USING (
    resolve_idea_bank_role(
      (SELECT idea_bank_id FROM idea_slots WHERE id = idea_polls.slot_id),
      auth.uid()
    ) IN ('owner', 'editor')
  );

-- ============================================================
-- 8. idea_votes policies
-- ============================================================
DROP POLICY IF EXISTS idea_votes_select ON idea_votes;
DROP POLICY IF EXISTS idea_votes_insert ON idea_votes;
DROP POLICY IF EXISTS idea_votes_delete ON idea_votes;

CREATE POLICY "idea_votes_select" ON idea_votes
  FOR SELECT USING (
    resolve_idea_bank_role(
      (SELECT idea_bank_id FROM idea_slots WHERE id = (SELECT slot_id FROM idea_polls WHERE id = idea_votes.poll_id)),
      auth.uid()
    ) IS NOT NULL
  );

CREATE POLICY "idea_votes_insert" ON idea_votes
  FOR INSERT WITH CHECK (
    resolve_idea_bank_role(
      (SELECT idea_bank_id FROM idea_slots WHERE id = (SELECT slot_id FROM idea_polls WHERE id = idea_votes.poll_id)),
      auth.uid()
    ) IN ('owner', 'editor', 'voter')
    AND (SELECT is_open FROM idea_polls WHERE id = idea_votes.poll_id) = true
    AND idea_votes.user_id = auth.uid()
  );

CREATE POLICY "idea_votes_delete" ON idea_votes
  FOR DELETE USING (
    user_id = auth.uid()
  );

-- ============================================================
-- 9. idea_comments policies
-- ============================================================
DROP POLICY IF EXISTS idea_comments_select ON idea_comments;
DROP POLICY IF EXISTS idea_comments_insert ON idea_comments;
DROP POLICY IF EXISTS idea_comments_update ON idea_comments;
DROP POLICY IF EXISTS idea_comments_delete ON idea_comments;

CREATE POLICY "idea_comments_select" ON idea_comments
  FOR SELECT USING (
    resolve_idea_bank_role(idea_bank_id, auth.uid()) IS NOT NULL
  );

CREATE POLICY "idea_comments_insert" ON idea_comments
  FOR INSERT WITH CHECK (
    resolve_idea_bank_role(idea_bank_id, auth.uid()) IS NOT NULL
  );

CREATE POLICY "idea_comments_update" ON idea_comments
  FOR UPDATE USING (
    user_id = auth.uid()
    OR resolve_idea_bank_role(idea_bank_id, auth.uid()) IN ('owner', 'editor')
  );

CREATE POLICY "idea_comments_delete" ON idea_comments
  FOR DELETE USING (
    user_id = auth.uid()
    OR resolve_idea_bank_role(idea_bank_id, auth.uid()) IN ('owner', 'editor')
  );

-- ============================================================
-- 10. idea_bank_imports policy
-- ============================================================
DROP POLICY IF EXISTS idea_bank_imports_select ON idea_bank_imports;

CREATE POLICY "idea_bank_imports_select" ON idea_bank_imports
  FOR SELECT USING (
    resolve_idea_bank_role(idea_bank_id, auth.uid()) = 'owner'
  );