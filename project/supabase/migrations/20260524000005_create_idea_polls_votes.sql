-- ============================================================
-- Phase 3: Voting & Finalization
-- Creates idea_polls and idea_votes tables
-- ============================================================

-- Poll attached to a slot (1:1, optional)
CREATE TABLE IF NOT EXISTS idea_polls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slot_id UUID NOT NULL UNIQUE REFERENCES idea_slots(id) ON DELETE CASCADE,
  created_by UUID REFERENCES users(id),
  is_open BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  closed_at TIMESTAMPTZ
);

ALTER TABLE idea_polls ENABLE ROW LEVEL SECURITY;

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
    )
  );

CREATE POLICY "idea_polls_insert" ON idea_polls
  FOR INSERT WITH CHECK (
    slot_id IN (
      SELECT is2.id FROM idea_slots is2
      JOIN idea_banks ib ON is2.idea_bank_id = ib.id
      WHERE ib.project_id IN (SELECT id FROM projects WHERE user_id = auth.uid() AND deleted_at IS NULL)
    )
  );

CREATE POLICY "idea_polls_update" ON idea_polls
  FOR UPDATE USING (
    slot_id IN (
      SELECT is2.id FROM idea_slots is2
      JOIN idea_banks ib ON is2.idea_bank_id = ib.id
      WHERE ib.project_id IN (SELECT id FROM projects WHERE user_id = auth.uid() AND deleted_at IS NULL)
    )
  );

CREATE POLICY "idea_polls_delete" ON idea_polls
  FOR DELETE USING (
    slot_id IN (
      SELECT is2.id FROM idea_slots is2
      JOIN idea_banks ib ON is2.idea_bank_id = ib.id
      WHERE ib.project_id IN (SELECT id FROM projects WHERE user_id = auth.uid() AND deleted_at IS NULL)
    )
  );

CREATE INDEX idx_idea_polls_slot ON idea_polls(slot_id);


-- Individual vote: one per user per poll
CREATE TABLE IF NOT EXISTS idea_votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  poll_id UUID NOT NULL REFERENCES idea_polls(id) ON DELETE CASCADE,
  idea_card_id UUID NOT NULL REFERENCES idea_cards(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT now(),

  UNIQUE(poll_id, user_id)  -- one vote per user per poll
);

ALTER TABLE idea_votes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "idea_votes_select" ON idea_votes
  FOR SELECT USING (
    poll_id IN (
      SELECT ip.id FROM idea_polls ip
      JOIN idea_slots is2 ON ip.slot_id = is2.id
      JOIN idea_banks ib ON is2.idea_bank_id = ib.id
      WHERE ib.project_id IN (SELECT id FROM projects WHERE user_id = auth.uid() AND deleted_at IS NULL)
        OR ib.project_id IN (
          SELECT pc.project_id FROM project_collaborators pc
          WHERE pc.user_id = auth.uid() AND pc.status = 'active'
        )
    )
  );

CREATE POLICY "idea_votes_insert" ON idea_votes
  FOR INSERT WITH CHECK (
    poll_id IN (
      SELECT ip.id FROM idea_polls ip
      JOIN idea_slots is2 ON ip.slot_id = is2.id
      JOIN idea_banks ib ON is2.idea_bank_id = ib.id
      WHERE ib.project_id IN (SELECT id FROM projects WHERE user_id = auth.uid() AND deleted_at IS NULL)
    )
    AND user_id = auth.uid()
  );

CREATE POLICY "idea_votes_delete" ON idea_votes
  FOR DELETE USING (
    user_id = auth.uid()
  );

CREATE INDEX idx_idea_votes_poll ON idea_votes(poll_id);
CREATE INDEX idx_idea_votes_idea_card ON idea_votes(idea_card_id);
CREATE INDEX idx_idea_votes_user ON idea_votes(user_id);


-- Vote count view for efficient aggregation
CREATE OR REPLACE VIEW idea_vote_counts AS
SELECT
  ic.id AS idea_card_id,
  ic.slot_id,
  COUNT(iv.id) AS vote_count
FROM idea_cards ic
LEFT JOIN idea_votes iv ON iv.idea_card_id = ic.id
WHERE ic.deleted_at IS NULL
GROUP BY ic.id, ic.slot_id;