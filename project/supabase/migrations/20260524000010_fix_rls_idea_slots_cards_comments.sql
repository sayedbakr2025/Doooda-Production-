-- ============================================================
-- Stabilization: Fix RLS policies for idea_slots, idea_cards, idea_comments
--
-- Issues fixed:
-- 1. idea_slots INSERT/UPDATE/DELETE only allowed project owner
--    → Now includes project collaborators (manager/editor) and idea bank editors
-- 2. idea_cards INSERT/UPDATE/DELETE only allowed project owner
--    → Same fix
-- 3. idea_comments INSERT missing project collaborators and 'owner' role doesn't
--    exist in idea_bank_collaborators (CHECK constrains to viewer/voter/editor)
--    → Fix: add project_collaborators, fix role check, allow voters to comment
-- 4. idea_comments UPDATE/DELETE: same issues with role checks
-- ============================================================

-- ============================================================
-- idea_slots: Drop old restrictive INSERT/UPDATE/DELETE policies
-- ============================================================
DROP POLICY IF EXISTS idea_slots_insert ON idea_slots;
DROP POLICY IF EXISTS idea_slots_update ON idea_slots;
DROP POLICY IF EXISTS idea_slots_delete ON idea_slots;

-- idea_slots INSERT: project owner, project manager/editor, idea bank editor
CREATE POLICY "idea_slots_insert" ON idea_slots
  FOR INSERT WITH CHECK (
    idea_bank_id IN (SELECT id FROM idea_banks WHERE
      project_id IN (SELECT id FROM projects WHERE user_id = auth.uid() AND deleted_at IS NULL)
      OR project_id IN (
        SELECT pc.project_id FROM project_collaborators pc
        WHERE pc.user_id = auth.uid() AND pc.role IN ('manager', 'editor') AND pc.status = 'active'
      )
      OR id IN (
        SELECT ibc.idea_bank_id FROM idea_bank_collaborators ibc
        WHERE ibc.user_id = auth.uid() AND ibc.role = 'editor' AND ibc.status = 'active'
      )
    )
  );

-- idea_slots UPDATE: project owner, project manager/editor, idea bank editor
CREATE POLICY "idea_slots_update" ON idea_slots
  FOR UPDATE USING (
    idea_bank_id IN (SELECT id FROM idea_banks WHERE
      project_id IN (SELECT id FROM projects WHERE user_id = auth.uid() AND deleted_at IS NULL)
      OR project_id IN (
        SELECT pc.project_id FROM project_collaborators pc
        WHERE pc.user_id = auth.uid() AND pc.role IN ('manager', 'editor') AND pc.status = 'active'
      )
      OR id IN (
        SELECT ibc.idea_bank_id FROM idea_bank_collaborators ibc
        WHERE ibc.user_id = auth.uid() AND ibc.role = 'editor' AND ibc.status = 'active'
      )
    )
  );

-- idea_slots DELETE: project owner, project manager, idea bank editor
CREATE POLICY "idea_slots_delete" ON idea_slots
  FOR DELETE USING (
    idea_bank_id IN (SELECT id FROM idea_banks WHERE
      project_id IN (SELECT id FROM projects WHERE user_id = auth.uid() AND deleted_at IS NULL)
      OR project_id IN (
        SELECT pc.project_id FROM project_collaborators pc
        WHERE pc.user_id = auth.uid() AND pc.role IN ('manager', 'editor') AND pc.status = 'active'
      )
      OR id IN (
        SELECT ibc.idea_bank_id FROM idea_bank_collaborators ibc
        WHERE ibc.user_id = auth.uid() AND ibc.role = 'editor' AND ibc.status = 'active'
      )
    )
  );

-- ============================================================
-- idea_cards: Drop old restrictive INSERT/UPDATE/DELETE policies
-- ============================================================
DROP POLICY IF EXISTS idea_cards_insert ON idea_cards;
DROP POLICY IF EXISTS idea_cards_update ON idea_cards;
DROP POLICY IF EXISTS idea_cards_delete ON idea_cards;

-- idea_cards INSERT: project owner, project manager/editor, idea bank editor
CREATE POLICY "idea_cards_insert" ON idea_cards
  FOR INSERT WITH CHECK (
    slot_id IN (
      SELECT is2.id FROM idea_slots is2
      JOIN idea_banks ib ON is2.idea_bank_id = ib.id
      WHERE
        ib.project_id IN (SELECT id FROM projects WHERE user_id = auth.uid() AND deleted_at IS NULL)
        OR ib.project_id IN (
          SELECT pc.project_id FROM project_collaborators pc
          WHERE pc.user_id = auth.uid() AND pc.role IN ('manager', 'editor') AND pc.status = 'active'
        )
        OR ib.id IN (
          SELECT ibc.idea_bank_id FROM idea_bank_collaborators ibc
          WHERE ibc.user_id = auth.uid() AND ibc.role = 'editor' AND ibc.status = 'active'
        )
    )
  );

-- idea_cards UPDATE: project owner, project manager/editor, idea bank editor
CREATE POLICY "idea_cards_update" ON idea_cards
  FOR UPDATE USING (
    slot_id IN (
      SELECT is2.id FROM idea_slots is2
      JOIN idea_banks ib ON is2.idea_bank_id = ib.id
      WHERE
        ib.project_id IN (SELECT id FROM projects WHERE user_id = auth.uid() AND deleted_at IS NULL)
        OR ib.project_id IN (
          SELECT pc.project_id FROM project_collaborators pc
          WHERE pc.user_id = auth.uid() AND pc.role IN ('manager', 'editor') AND pc.status = 'active'
        )
        OR ib.id IN (
          SELECT ibc.idea_bank_id FROM idea_bank_collaborators ibc
          WHERE ibc.user_id = auth.uid() AND ibc.role = 'editor' AND ibc.status = 'active'
        )
    )
  );

-- idea_cards DELETE: project owner, project manager/editor, idea bank editor
CREATE POLICY "idea_cards_delete" ON idea_cards
  FOR DELETE USING (
    slot_id IN (
      SELECT is2.id FROM idea_slots is2
      JOIN idea_banks ib ON is2.idea_bank_id = ib.id
      WHERE
        ib.project_id IN (SELECT id FROM projects WHERE user_id = auth.uid() AND deleted_at IS NULL)
        OR ib.project_id IN (
          SELECT pc.project_id FROM project_collaborators pc
          WHERE pc.user_id = auth.uid() AND pc.role IN ('manager', 'editor') AND pc.status = 'active'
        )
        OR ib.id IN (
          SELECT ibc.idea_bank_id FROM idea_bank_collaborators ibc
          WHERE ibc.user_id = auth.uid() AND ibc.role = 'editor' AND ibc.status = 'active'
        )
    )
  );

-- ============================================================
-- idea_comments: Fix INSERT/UPDATE/DELETE policies
-- ============================================================
DROP POLICY IF EXISTS idea_comments_insert ON idea_comments;
DROP POLICY IF EXISTS idea_comments_update ON idea_comments;
DROP POLICY IF EXISTS idea_comments_delete ON idea_comments;

-- idea_comments INSERT: anyone who can see the bank (owner, project collabs, IB collabs)
-- voters and viewers can comment too — commenting is a basic interaction
CREATE POLICY "idea_comments_insert" ON idea_comments
  FOR INSERT WITH CHECK (
    idea_bank_id IN (SELECT id FROM idea_banks WHERE
      project_id IN (SELECT id FROM projects WHERE user_id = auth.uid() AND deleted_at IS NULL)
      OR project_id IN (
        SELECT pc.project_id FROM project_collaborators pc
        WHERE pc.user_id = auth.uid() AND pc.status = 'active'
      )
      OR id IN (
        SELECT ibc.idea_bank_id FROM idea_bank_collaborators ibc
        WHERE ibc.user_id = auth.uid() AND ibc.status = 'active'
      )
    )
  );

-- idea_comments UPDATE: comment author, project owner, project manager/editor, idea bank editor
CREATE POLICY "idea_comments_update" ON idea_comments
  FOR UPDATE USING (
    user_id = auth.uid()
    OR idea_bank_id IN (SELECT id FROM idea_banks WHERE
      project_id IN (SELECT id FROM projects WHERE user_id = auth.uid() AND deleted_at IS NULL)
      OR project_id IN (
        SELECT pc.project_id FROM project_collaborators pc
        WHERE pc.user_id = auth.uid() AND pc.role IN ('manager', 'editor') AND pc.status = 'active'
      )
      OR id IN (
        SELECT ibc.idea_bank_id FROM idea_bank_collaborators ibc
        WHERE ibc.user_id = auth.uid() AND ibc.role = 'editor' AND ibc.status = 'active'
      )
    )
  );

-- idea_comments DELETE: comment author, project owner, project manager/editor, idea bank editor
CREATE POLICY "idea_comments_delete" ON idea_comments
  FOR DELETE USING (
    user_id = auth.uid()
    OR idea_bank_id IN (SELECT id FROM idea_banks WHERE
      project_id IN (SELECT id FROM projects WHERE user_id = auth.uid() AND deleted_at IS NULL)
      OR project_id IN (
        SELECT pc.project_id FROM project_collaborators pc
        WHERE pc.user_id = auth.uid() AND pc.role IN ('manager', 'editor') AND pc.status = 'active'
      )
      OR id IN (
        SELECT ibc.idea_bank_id FROM idea_bank_collaborators ibc
        WHERE ibc.user_id = auth.uid() AND ibc.role = 'editor' AND ibc.status = 'active'
      )
    )
  );