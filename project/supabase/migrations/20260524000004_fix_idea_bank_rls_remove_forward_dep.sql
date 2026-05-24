-- ============================================================
-- Phase 2 FIX: Remove forward dependency on idea_bank_collaborators
-- Replace complex RLS with permissive SELECT policies
-- (collaborator-aware RLS will be added in Phase 4)
-- ============================================================

-- Drop the overly complex policies that reference idea_bank_collaborators
DROP POLICY IF EXISTS idea_banks_select ON idea_banks;
DROP POLICY IF EXISTS idea_slots_select ON idea_slots;
DROP POLICY IF EXISTS idea_cards_select ON idea_cards;

-- Replace with permissive SELECT policies (read access for authenticated users)
-- Phase 4 will tighten these with collaborator-aware checks
CREATE POLICY "idea_banks_select" ON idea_banks
  FOR SELECT USING (
    project_id IN (SELECT id FROM projects WHERE user_id = auth.uid() AND deleted_at IS NULL)
    OR project_id IN (
      SELECT pc.project_id FROM project_collaborators pc
      WHERE pc.user_id = auth.uid() AND pc.status = 'active'
    )
  );

CREATE POLICY "idea_slots_select" ON idea_slots
  FOR SELECT USING (
    idea_bank_id IN (SELECT id FROM idea_banks WHERE
      project_id IN (SELECT id FROM projects WHERE user_id = auth.uid() AND deleted_at IS NULL)
      OR project_id IN (
        SELECT pc.project_id FROM project_collaborators pc
        WHERE pc.user_id = auth.uid() AND pc.status = 'active'
      )
    )
  );

CREATE POLICY "idea_cards_select" ON idea_cards
  FOR SELECT USING (
    slot_id IN (
      SELECT is2.id FROM idea_slots is2
      JOIN idea_banks ib ON is2.idea_bank_id = ib.id
      WHERE ib.project_id IN (SELECT id FROM projects WHERE user_id = auth.uid() AND deleted_at IS NULL)
        OR ib.project_id IN (
          SELECT pc.project_id FROM project_collaborators pc
          WHERE pc.user_id = auth.uid() AND pc.status = 'active'
        )
    )
  );