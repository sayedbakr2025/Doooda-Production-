-- ============================================================
-- Fix: Replace all Idea Bank RLS policies with recursion-safe versions.
--
-- Root cause: is_project_member() SECURITY DEFINER function
-- doesn't work reliably in RLS WITH CHECK policies.
--
-- Strategy:
-- - SELECT policies: use resolve_idea_bank_role() (SECURITY DEFINER, bypasses RLS)
-- - INSERT/UPDATE/DELETE policies: use direct subqueries on projects/project_collaborators
--   (no reference to idea_bank_collaborators = no recursion)
-- - idea_bank_collaborators: use resolve_idea_bank_role() + user_id fallback
-- ============================================================

-- ============================================================
-- 1. idea_banks
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
    project_id IN (SELECT id FROM projects WHERE user_id = auth.uid() AND deleted_at IS NULL)
  );

CREATE POLICY "idea_banks_update" ON idea_banks
  FOR UPDATE USING (
    project_id IN (SELECT id FROM projects WHERE user_id = auth.uid() AND deleted_at IS NULL)
  );

-- ============================================================
-- 2. idea_bank_collaborators
-- ============================================================
DROP POLICY IF EXISTS idea_bank_collabs_select ON idea_bank_collaborators;
DROP POLICY IF EXISTS idea_bank_collabs_modify ON idea_bank_collaborators;

CREATE POLICY "idea_bank_collabs_select" ON idea_bank_collaborators
  FOR SELECT USING (
    resolve_idea_bank_role(idea_bank_id, auth.uid()) IS NOT NULL
    OR user_id = auth.uid()
  );

CREATE POLICY "idea_bank_collabs_modify" ON idea_bank_collaborators
  FOR ALL USING (
    idea_bank_id IN (SELECT id FROM idea_banks WHERE
      project_id IN (SELECT id FROM projects WHERE user_id = auth.uid() AND deleted_at IS NULL)
      OR project_id IN (
        SELECT pc.project_id FROM project_collaborators pc
        WHERE pc.user_id = auth.uid() AND pc.role IN ('manager') AND pc.status = 'active'
      )
    )
  );

-- ============================================================
-- 3. idea_slots
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
    idea_bank_id IN (SELECT id FROM idea_banks WHERE
      project_id IN (SELECT id FROM projects WHERE user_id = auth.uid() AND deleted_at IS NULL)
      OR project_id IN (
        SELECT pc.project_id FROM project_collaborators pc
        WHERE pc.user_id = auth.uid() AND pc.role IN ('manager', 'editor') AND pc.status = 'active'
      )
    )
  );

CREATE POLICY "idea_slots_update" ON idea_slots
  FOR UPDATE USING (
    idea_bank_id IN (SELECT id FROM idea_banks WHERE
      project_id IN (SELECT id FROM projects WHERE user_id = auth.uid() AND deleted_at IS NULL)
      OR project_id IN (
        SELECT pc.project_id FROM project_collaborators pc
        WHERE pc.user_id = auth.uid() AND pc.role IN ('manager', 'editor') AND pc.status = 'active'
      )
    )
  );

CREATE POLICY "idea_slots_delete" ON idea_slots
  FOR DELETE USING (
    idea_bank_id IN (SELECT id FROM idea_banks WHERE
      project_id IN (SELECT id FROM projects WHERE user_id = auth.uid() AND deleted_at IS NULL)
      OR project_id IN (
        SELECT pc.project_id FROM project_collaborators pc
        WHERE pc.user_id = auth.uid() AND pc.role IN ('manager', 'editor') AND pc.status = 'active'
      )
    )
  );

-- ============================================================
-- 4. idea_cards
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
    slot_id IN (
      SELECT is2.id FROM idea_slots is2
      JOIN idea_banks ib ON is2.idea_bank_id = ib.id
      WHERE ib.project_id IN (SELECT id FROM projects WHERE user_id = auth.uid() AND deleted_at IS NULL)
        OR ib.project_id IN (
          SELECT pc.project_id FROM project_collaborators pc
          WHERE pc.user_id = auth.uid() AND pc.role IN ('manager', 'editor') AND pc.status = 'active'
        )
    )
  );

CREATE POLICY "idea_cards_update" ON idea_cards
  FOR UPDATE USING (
    slot_id IN (
      SELECT is2.id FROM idea_slots is2
      JOIN idea_banks ib ON is2.idea_bank_id = ib.id
      WHERE ib.project_id IN (SELECT id FROM projects WHERE user_id = auth.uid() AND deleted_at IS NULL)
        OR ib.project_id IN (
          SELECT pc.project_id FROM project_collaborators pc
          WHERE pc.user_id = auth.uid() AND pc.role IN ('manager', 'editor') AND pc.status = 'active'
        )
    )
  );

CREATE POLICY "idea_cards_delete" ON idea_cards
  FOR DELETE USING (
    slot_id IN (
      SELECT is2.id FROM idea_slots is2
      JOIN idea_banks ib ON is2.idea_bank_id = ib.id
      WHERE ib.project_id IN (SELECT id FROM projects WHERE user_id = auth.uid() AND deleted_at IS NULL)
        OR ib.project_id IN (
          SELECT pc.project_id FROM project_collaborators pc
          WHERE pc.user_id = auth.uid() AND pc.role IN ('manager', 'editor') AND pc.status = 'active'
        )
    )
  );

-- ============================================================
-- 5. idea_polls
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
    slot_id IN (
      SELECT is2.id FROM idea_slots is2
      JOIN idea_banks ib ON is2.idea_bank_id = ib.id
      WHERE ib.project_id IN (SELECT id FROM projects WHERE user_id = auth.uid() AND deleted_at IS NULL)
        OR ib.project_id IN (
          SELECT pc.project_id FROM project_collaborators pc
          WHERE pc.user_id = auth.uid() AND pc.role IN ('manager', 'editor') AND pc.status = 'active'
        )
    )
  );

CREATE POLICY "idea_polls_update" ON idea_polls
  FOR UPDATE USING (
    slot_id IN (
      SELECT is2.id FROM idea_slots is2
      JOIN idea_banks ib ON is2.idea_bank_id = ib.id
      WHERE ib.project_id IN (SELECT id FROM projects WHERE user_id = auth.uid() AND deleted_at IS NULL)
        OR ib.project_id IN (
          SELECT pc.project_id FROM project_collaborators pc
          WHERE pc.user_id = auth.uid() AND pc.role IN ('manager', 'editor') AND pc.status = 'active'
        )
    )
  );

CREATE POLICY "idea_polls_delete" ON idea_polls
  FOR DELETE USING (
    slot_id IN (
      SELECT is2.id FROM idea_slots is2
      JOIN idea_banks ib ON is2.idea_bank_id = ib.id
      WHERE ib.project_id IN (SELECT id FROM projects WHERE user_id = auth.uid() AND deleted_at IS NULL)
        OR ib.project_id IN (
          SELECT pc.project_id FROM project_collaborators pc
          WHERE pc.user_id = auth.uid() AND pc.role IN ('manager', 'editor') AND pc.status = 'active'
        )
    )
  );

-- ============================================================
-- 6. idea_votes
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
    AND user_id = auth.uid()
  );

CREATE POLICY "idea_votes_delete" ON idea_votes
  FOR DELETE USING (
    user_id = auth.uid()
  );

-- ============================================================
-- 7. idea_comments
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
-- 8. idea_bank_imports
-- ============================================================
DROP POLICY IF EXISTS idea_bank_imports_select ON idea_bank_imports;

CREATE POLICY "idea_bank_imports_select" ON idea_bank_imports
  FOR SELECT USING (
    resolve_idea_bank_role(idea_bank_id, auth.uid()) = 'owner'
  );