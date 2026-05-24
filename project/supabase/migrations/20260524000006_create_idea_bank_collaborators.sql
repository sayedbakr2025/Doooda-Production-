-- ============================================================
-- Phase 4: Sharing & Permissions
-- Creates idea_bank_collaborators table and updates ALL RLS policies
-- to include both project collaborators AND idea bank collaborators.
-- ============================================================

-- Idea Bank standalone sharing (for non-project-members)
CREATE TABLE IF NOT EXISTS idea_bank_collaborators (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  idea_bank_id UUID NOT NULL REFERENCES idea_banks(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('viewer', 'voter', 'editor')) DEFAULT 'viewer',
  status TEXT NOT NULL CHECK (status IN ('pending', 'active', 'frozen', 'rejected')) DEFAULT 'pending',
  invited_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT now(),

  UNIQUE(idea_bank_id, user_id)
);

ALTER TABLE idea_bank_collaborators ENABLE ROW LEVEL SECURITY;

-- Indexes
CREATE INDEX idx_idea_bank_collabs_bank ON idea_bank_collaborators(idea_bank_id);
CREATE INDEX idx_idea_bank_collabs_user ON idea_bank_collaborators(user_id);
CREATE INDEX idx_idea_bank_collabs_status ON idea_bank_collaborators(status);

-- ============================================================
-- Helper function: resolve effective role for a user on an idea bank
-- Returns the maximum of: inherited project role + explicit IB role
-- Priority: owner > editor > voter > viewer
-- Returns NULL if user has no access at all.
-- ============================================================
CREATE OR REPLACE FUNCTION resolve_idea_bank_role(p_idea_bank_id UUID, p_user_id UUID)
RETURNS TEXT AS $$
DECLARE
  v_project_id UUID;
  v_project_role TEXT;
  v_ib_role TEXT;
  v_owner BOOLEAN;
  v_effective_role TEXT;
BEGIN
  -- Get project_id from idea_bank
  SELECT project_id INTO v_project_id FROM idea_banks WHERE id = p_idea_bank_id;
  IF v_project_id IS NULL THEN RETURN NULL; END IF;

  -- Check if project owner
  SELECT user_id = p_user_id INTO v_owner FROM projects WHERE id = v_project_id AND deleted_at IS NULL;
  IF v_owner THEN RETURN 'owner'; END IF;

  -- Check project collaborator role (inherited)
  SELECT role INTO v_project_role FROM project_collaborators
  WHERE project_id = v_project_id AND user_id = p_user_id AND status = 'active';

  -- Map project role to inherited IB role
  IF v_project_role = 'manager' OR v_project_role = 'editor' THEN
    v_project_role := 'editor';
  ELSIF v_project_role = 'viewer' THEN
    v_project_role := 'viewer';
  ELSE
    v_project_role := NULL;
  END IF;

  -- Check explicit idea bank collaborator role
  SELECT role INTO v_ib_role FROM idea_bank_collaborators
  WHERE idea_bank_id = p_idea_bank_id AND user_id = p_user_id AND status = 'active';

  -- Compute effective = max of both roles
  -- Priority: editor > voter > viewer
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
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;


-- ============================================================
-- RLS policies for idea_bank_collaborators
-- ============================================================

-- Anyone who can see the idea bank can see its collaborators
CREATE POLICY "idea_bank_collabs_select" ON idea_bank_collaborators
  FOR SELECT USING (
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

-- Only project owners and managers can add/edit/remove IB collaborators
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
-- Update RLS policies for idea_banks, idea_slots, idea_cards, idea_polls, idea_votes
-- Now includes idea_bank_collaborators in the access check
-- ============================================================

-- Drop old permissive SELECT policies (from migration 00004)
DROP POLICY IF EXISTS idea_banks_select ON idea_banks;
DROP POLICY IF EXISTS idea_slots_select ON idea_slots;
DROP POLICY IF EXISTS idea_cards_select ON idea_cards;

-- Recreate with full access check (project owner + project collaborator + IB collaborator)
CREATE POLICY "idea_banks_select" ON idea_banks
  FOR SELECT USING (
    project_id IN (SELECT id FROM projects WHERE user_id = auth.uid() AND deleted_at IS NULL)
    OR project_id IN (
      SELECT pc.project_id FROM project_collaborators pc
      WHERE pc.user_id = auth.uid() AND pc.status = 'active'
    )
    OR id IN (
      SELECT ibc.idea_bank_id FROM idea_bank_collaborators ibc
      WHERE ibc.user_id = auth.uid() AND ibc.status = 'active'
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
      OR id IN (
        SELECT ibc.idea_bank_id FROM idea_bank_collaborators ibc
        WHERE ibc.user_id = auth.uid() AND ibc.status = 'active'
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
        OR ib.id IN (
          SELECT ibc.idea_bank_id FROM idea_bank_collaborators ibc
          WHERE ibc.user_id = auth.uid() AND ibc.status = 'active'
        )
    )
  );

-- idea_polls: same access as slots
DROP POLICY IF EXISTS idea_polls_select ON idea_polls;
CREATE POLICY "idea_polls_select" ON idea_polls
  FOR SELECT USING (
    slot_id IN (
      SELECT is2.id FROM idea_slots is2
      JOIN idea_banks ib ON is2.idea_bank_id = ib.id
      WHERE ib.project_id IN (SELECT id FROM projects WHERE user_id = auth.uid() AND deleted_at IS NULL)
        OR ib.project_id IN (
          SELECT pc.project_id FROM project_collaborators pc
          WHERE pc.user_id = auth.uid() AND pc.status = 'active'
        )
        OR ib.id IN (
          SELECT ibc.idea_bank_id FROM idea_bank_collaborators ibc
          WHERE ibc.user_id = auth.uid() AND ibc.status = 'active'
        )
    )
  );

-- idea_polls: only owner/managers/editors can create/modify
DROP POLICY IF EXISTS idea_polls_insert ON idea_polls;
DROP POLICY IF EXISTS idea_polls_update ON idea_polls;
DROP POLICY IF EXISTS idea_polls_delete ON idea_polls;

CREATE POLICY "idea_polls_insert" ON idea_polls
  FOR INSERT WITH CHECK (
    slot_id IN (
      SELECT is2.id FROM idea_slots is2
      JOIN idea_banks ib ON is2.idea_bank_id = ib.id
      WHERE resolve_idea_bank_role(ib.id, auth.uid()) IN ('owner', 'editor')
    )
  );

CREATE POLICY "idea_polls_update" ON idea_polls
  FOR UPDATE USING (
    slot_id IN (
      SELECT is2.id FROM idea_slots is2
      JOIN idea_banks ib ON is2.idea_bank_id = ib.id
      WHERE resolve_idea_bank_role(ib.id, auth.uid()) IN ('owner', 'editor')
    )
  );

CREATE POLICY "idea_polls_delete" ON idea_polls
  FOR DELETE USING (
    slot_id IN (
      SELECT is2.id FROM idea_slots is2
      JOIN idea_banks ib ON is2.idea_bank_id = ib.id
      WHERE resolve_idea_bank_role(ib.id, auth.uid()) IN ('owner', 'editor')
    )
  );

-- idea_votes: anyone with access can read; anyone with viewer+ can vote
DROP POLICY IF EXISTS idea_votes_select ON idea_votes;
CREATE POLICY "idea_votes_select" ON idea_votes
  FOR SELECT USING (
    poll_id IN (
      SELECT ip.id FROM idea_polls ip
      JOIN idea_slots is2 ON ip.slot_id = is2.id
      JOIN idea_banks ib ON is2.idea_bank_id = ib.id
      WHERE resolve_idea_bank_role(ib.id, auth.uid()) IS NOT NULL
    )
  );

DROP POLICY IF EXISTS idea_votes_insert ON idea_votes;
CREATE POLICY "idea_votes_insert" ON idea_votes
  FOR INSERT WITH CHECK (
    poll_id IN (
      SELECT ip.id FROM idea_polls ip
      JOIN idea_slots is2 ON ip.slot_id = is2.id
      JOIN idea_banks ib ON is2.idea_bank_id = ib.id
      WHERE resolve_idea_bank_role(ib.id, auth.uid()) IN ('owner', 'editor', 'voter')
      AND ip.is_open = true
    )
    AND user_id = auth.uid()
  );

DROP POLICY IF EXISTS idea_votes_delete ON idea_votes;
CREATE POLICY "idea_votes_delete" ON idea_votes
  FOR DELETE USING (
    user_id = auth.uid()
  );

-- idea_slots: editor+ can add/modify/delete
DROP POLICY IF EXISTS idea_slots_insert ON idea_slots;
DROP POLICY IF EXISTS idea_slots_update ON idea_slots;
DROP POLICY IF EXISTS idea_slots_delete ON idea_slots;

CREATE POLICY "idea_slots_insert" ON idea_slots
  FOR INSERT WITH CHECK (
    idea_bank_id IN (SELECT id FROM idea_banks WHERE
      resolve_idea_bank_role(id, auth.uid()) IN ('owner', 'editor')
    )
  );

CREATE POLICY "idea_slots_update" ON idea_slots
  FOR UPDATE USING (
    idea_bank_id IN (SELECT id FROM idea_banks WHERE
      resolve_idea_bank_role(id, auth.uid()) IN ('owner', 'editor')
    )
  );

CREATE POLICY "idea_slots_delete" ON idea_slots
  FOR DELETE USING (
    idea_bank_id IN (SELECT id FROM idea_banks WHERE
      resolve_idea_bank_role(id, auth.uid()) IN ('owner', 'editor')
    )
  );

-- idea_cards: editor+ can add/modify/delete; viewer/voter can only read
DROP POLICY IF EXISTS idea_cards_insert ON idea_cards;
DROP POLICY IF EXISTS idea_cards_update ON idea_cards;
DROP POLICY IF EXISTS idea_cards_delete ON idea_cards;

CREATE POLICY "idea_cards_insert" ON idea_cards
  FOR INSERT WITH CHECK (
    slot_id IN (
      SELECT is2.id FROM idea_slots is2
      JOIN idea_banks ib ON is2.idea_bank_id = ib.id
      WHERE resolve_idea_bank_role(ib.id, auth.uid()) IN ('owner', 'editor')
    )
  );

CREATE POLICY "idea_cards_update" ON idea_cards
  FOR UPDATE USING (
    slot_id IN (
      SELECT is2.id FROM idea_slots is2
      JOIN idea_banks ib ON is2.idea_bank_id = ib.id
      WHERE resolve_idea_bank_role(ib.id, auth.uid()) IN ('owner', 'editor')
    )
  );

CREATE POLICY "idea_cards_delete" ON idea_cards
  FOR DELETE USING (
    slot_id IN (
      SELECT is2.id FROM idea_slots is2
      JOIN idea_banks ib ON is2.idea_bank_id = ib.id
      WHERE resolve_idea_bank_role(ib.id, auth.uid()) IN ('owner', 'editor')
    )
  );

-- idea_banks: owner/managers can modify
DROP POLICY IF EXISTS idea_banks_insert ON idea_banks;
DROP POLICY IF EXISTS idea_banks_update ON idea_banks;

CREATE POLICY "idea_banks_insert" ON idea_banks
  FOR INSERT WITH CHECK (
    project_id IN (SELECT id FROM projects WHERE user_id = auth.uid() AND deleted_at IS NULL)
  );

CREATE POLICY "idea_banks_update" ON idea_banks
  FOR UPDATE USING (
    project_id IN (SELECT id FROM projects WHERE user_id = auth.uid() AND deleted_at IS NULL)
  );


-- ============================================================
-- Notification trigger for idea bank invitations
-- ============================================================
CREATE OR REPLACE FUNCTION notify_idea_bank_invitation()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO notifications (user_id, type, title, message, category, cta_label, cta_link)
  VALUES (
    NEW.user_id,
    'idea_bank_invite',
    'Idea Bank Invitation',
    'You have been invited to collaborate on an Idea Bank.',
    'invites',
    'View',
    '/projects/' || (SELECT project_id FROM idea_banks WHERE id = NEW.idea_bank_id)
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_idea_bank_collab_invite
  AFTER INSERT ON idea_bank_collaborators
  FOR EACH ROW
  WHEN (NEW.status = 'pending')
  EXECUTE FUNCTION notify_idea_bank_invitation();