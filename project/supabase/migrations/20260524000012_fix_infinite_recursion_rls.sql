-- ============================================================
-- Fix: Infinite recursion in RLS policies
--
-- Problem: idea_banks SELECT checks idea_bank_collaborators,
-- and idea_bank_collaborators SELECT checks idea_banks,
-- creating infinite recursion (Postgres error 42P17).
--
-- Solution: Use resolve_idea_bank_role() (SECURITY DEFINER,
-- bypasses RLS) instead of direct subqueries into
-- idea_bank_collaborators. For idea_bank_collaborators
-- itself, only check project ownership/collaboration (no self-ref).
-- ============================================================

-- ============================================================
-- 1. idea_banks SELECT: use resolve_idea_bank_role()
-- ============================================================
DROP POLICY IF EXISTS idea_banks_select ON idea_banks;

CREATE POLICY "idea_banks_select" ON idea_banks
  FOR SELECT USING (
    resolve_idea_bank_role(id, auth.uid()) IS NOT NULL
  );

-- ============================================================
-- 2. idea_slots SELECT: use resolve_idea_bank_role()
-- ============================================================
DROP POLICY IF EXISTS idea_slots_select ON idea_slots;

CREATE POLICY "idea_slots_select" ON idea_slots
  FOR SELECT USING (
    resolve_idea_bank_role(idea_bank_id, auth.uid()) IS NOT NULL
  );

-- ============================================================
-- 3. idea_cards SELECT: use resolve_idea_bank_role()
-- ============================================================
DROP POLICY IF EXISTS idea_cards_select ON idea_cards;

CREATE POLICY "idea_cards_select" ON idea_cards
  FOR SELECT USING (
    slot_id IN (
      SELECT is2.id FROM idea_slots is2
      WHERE resolve_idea_bank_role(is2.idea_bank_id, auth.uid()) IS NOT NULL
    )
  );

-- ============================================================
-- 4. idea_bank_collaborators SELECT: project owner or project collaborator only
--    (NO self-reference to idea_bank_collaborators)
-- ============================================================
DROP POLICY IF EXISTS idea_bank_collabs_select ON idea_bank_collaborators;

CREATE POLICY "idea_bank_collabs_select" ON idea_bank_collaborators
  FOR SELECT USING (
    idea_bank_id IN (SELECT id FROM idea_banks WHERE
      project_id IN (SELECT id FROM projects WHERE user_id = auth.uid() AND deleted_at IS NULL)
      OR project_id IN (
        SELECT pc.project_id FROM project_collaborators pc
        WHERE pc.user_id = auth.uid() AND pc.status = 'active'
      )
    )
    OR user_id = auth.uid()
  );

-- ============================================================
-- 5. idea_bank_collaborators INSERT/UPDATE/DELETE: project owner/managers only
-- ============================================================
DROP POLICY IF EXISTS idea_bank_collabs_modify ON idea_bank_collaborators;

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
-- 6. idea_slots INSERT/UPDATE/DELETE: use resolve_idea_bank_role()
-- ============================================================
DROP POLICY IF EXISTS idea_slots_insert ON idea_slots;
DROP POLICY IF EXISTS idea_slots_update ON idea_slots;
DROP POLICY IF EXISTS idea_slots_delete ON idea_slots;

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
-- 7. idea_cards INSERT/UPDATE/DELETE: use resolve_idea_bank_role()
-- ============================================================
DROP POLICY IF EXISTS idea_cards_insert ON idea_cards;
DROP POLICY IF EXISTS idea_cards_update ON idea_cards;
DROP POLICY IF EXISTS idea_cards_delete ON idea_cards;

CREATE POLICY "idea_cards_insert" ON idea_cards
  FOR INSERT WITH CHECK (
    slot_id IN (
      SELECT is2.id FROM idea_slots is2
      WHERE resolve_idea_bank_role(is2.idea_bank_id, auth.uid()) IN ('owner', 'editor')
    )
  );

CREATE POLICY "idea_cards_update" ON idea_cards
  FOR UPDATE USING (
    slot_id IN (
      SELECT is2.id FROM idea_slots is2
      WHERE resolve_idea_bank_role(is2.idea_bank_id, auth.uid()) IN ('owner', 'editor')
    )
  );

CREATE POLICY "idea_cards_delete" ON idea_cards
  FOR DELETE USING (
    slot_id IN (
      SELECT is2.id FROM idea_slots is2
      WHERE resolve_idea_bank_role(is2.idea_bank_id, auth.uid()) IN ('owner', 'editor')
    )
  );

-- ============================================================
-- 8. idea_polls SELECT/INSERT/UPDATE/DELETE: use resolve_idea_bank_role()
-- ============================================================
DROP POLICY IF EXISTS idea_polls_select ON idea_polls;

CREATE POLICY "idea_polls_select" ON idea_polls
  FOR SELECT USING (
    slot_id IN (
      SELECT is2.id FROM idea_slots is2
      WHERE resolve_idea_bank_role(is2.idea_bank_id, auth.uid()) IS NOT NULL
    )
  );

DROP POLICY IF EXISTS idea_polls_insert ON idea_polls;
DROP POLICY IF EXISTS idea_polls_update ON idea_polls;
DROP POLICY IF EXISTS idea_polls_delete ON idea_polls;

CREATE POLICY "idea_polls_insert" ON idea_polls
  FOR INSERT WITH CHECK (
    slot_id IN (
      SELECT is2.id FROM idea_slots is2
      WHERE resolve_idea_bank_role(is2.idea_bank_id, auth.uid()) IN ('owner', 'editor')
    )
  );

CREATE POLICY "idea_polls_update" ON idea_polls
  FOR UPDATE USING (
    slot_id IN (
      SELECT is2.id FROM idea_slots is2
      WHERE resolve_idea_bank_role(is2.idea_bank_id, auth.uid()) IN ('owner', 'editor')
    )
  );

CREATE POLICY "idea_polls_delete" ON idea_polls
  FOR DELETE USING (
    slot_id IN (
      SELECT is2.id FROM idea_slots is2
      WHERE resolve_idea_bank_role(is2.idea_bank_id, auth.uid()) IN ('owner', 'editor')
    )
  );

-- ============================================================
-- 9. idea_votes SELECT/INSERT: use resolve_idea_bank_role()
-- ============================================================
DROP POLICY IF EXISTS idea_votes_select ON idea_votes;
DROP POLICY IF EXISTS idea_votes_insert ON idea_votes;
DROP POLICY IF EXISTS idea_votes_delete ON idea_votes;

CREATE POLICY "idea_votes_select" ON idea_votes
  FOR SELECT USING (
    poll_id IN (
      SELECT ip.id FROM idea_polls ip
      JOIN idea_slots is2 ON ip.slot_id = is2.id
      WHERE resolve_idea_bank_role(is2.idea_bank_id, auth.uid()) IS NOT NULL
    )
  );

CREATE POLICY "idea_votes_insert" ON idea_votes
  FOR INSERT WITH CHECK (
    poll_id IN (
      SELECT ip.id FROM idea_polls ip
      JOIN idea_slots is2 ON ip.slot_id = is2.id
      WHERE resolve_idea_bank_role(is2.idea_bank_id, auth.uid()) IN ('owner', 'editor', 'voter')
      AND ip.is_open = true
    )
    AND user_id = auth.uid()
  );

CREATE POLICY "idea_votes_delete" ON idea_votes
  FOR DELETE USING (
    user_id = auth.uid()
  );

-- ============================================================
-- 10. idea_comments INSERT/UPDATE/DELETE: use resolve_idea_bank_role()
-- ============================================================
DROP POLICY IF EXISTS idea_comments_insert ON idea_comments;
DROP POLICY IF EXISTS idea_comments_update ON idea_comments;
DROP POLICY IF EXISTS idea_comments_delete ON idea_comments;

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
-- 11. idea_bank_imports: use resolve_idea_bank_role()
-- ============================================================
DROP POLICY IF EXISTS idea_bank_imports_select ON idea_bank_imports;

CREATE POLICY "idea_bank_imports_select" ON idea_bank_imports
  FOR SELECT USING (
    idea_bank_id IN (SELECT id FROM idea_banks WHERE resolve_idea_bank_role(id, auth.uid()) IS NOT NULL)
  );