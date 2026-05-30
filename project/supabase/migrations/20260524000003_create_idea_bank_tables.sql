-- ============================================================
-- Phase 2: Idea Bank Core Tables
-- Creates idea_banks, idea_slots, idea_cards
-- NO modifications to existing tables.
-- ============================================================

-- Idea Bank container (1 per project)
CREATE TABLE IF NOT EXISTS idea_banks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),

  UNIQUE(project_id)
);

-- Enable RLS
ALTER TABLE idea_banks ENABLE ROW LEVEL SECURITY;

-- Idea Banks: visible to project owner + project collaborators
-- idea_bank_collaborators will be added in migration 00006
CREATE POLICY "idea_banks_select" ON idea_banks
  FOR SELECT USING (
    project_id IN (SELECT id FROM projects WHERE user_id = auth.uid() AND deleted_at IS NULL)
    OR project_id IN (
      SELECT pc.project_id FROM project_collaborators pc
      WHERE pc.user_id = auth.uid() AND pc.status = 'active'
    )
  );

CREATE POLICY "idea_banks_insert" ON idea_banks
  FOR INSERT WITH CHECK (
    project_id IN (SELECT id FROM projects WHERE user_id = auth.uid() AND deleted_at IS NULL)
  );

CREATE POLICY "idea_banks_update" ON idea_banks
  FOR UPDATE USING (
    project_id IN (SELECT id FROM projects WHERE user_id = auth.uid() AND deleted_at IS NULL)
  );

CREATE INDEX idx_idea_banks_project ON idea_banks(project_id);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_idea_banks_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_idea_banks_updated_at
  BEFORE UPDATE ON idea_banks
  FOR EACH ROW
  EXECUTE FUNCTION update_idea_banks_updated_at();


-- Narrative slots (hierarchical: level 1 = container, level 2 = unit)
-- For Novel: level_1 = Chapter slot, level_2 = Scene slot
-- For Film Script: level_1 = Scene slot (no level 2)
CREATE TABLE IF NOT EXISTS idea_slots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  idea_bank_id UUID NOT NULL REFERENCES idea_banks(id) ON DELETE CASCADE,
  parent_slot_id UUID REFERENCES idea_slots(id) ON DELETE CASCADE,
  level SMALLINT NOT NULL DEFAULT 1 CHECK (level IN (1, 2)),
  position INTEGER NOT NULL DEFAULT 0,
  title TEXT,
  summary TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE idea_slots ENABLE ROW LEVEL SECURITY;

-- idea_slots: visible to project owner + project collaborators
-- idea_bank_collaborators will be added in migration 00006
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

CREATE POLICY "idea_slots_insert" ON idea_slots
  FOR INSERT WITH CHECK (
    idea_bank_id IN (SELECT id FROM idea_banks WHERE
      project_id IN (SELECT id FROM projects WHERE user_id = auth.uid() AND deleted_at IS NULL)
    )
  );

CREATE POLICY "idea_slots_update" ON idea_slots
  FOR UPDATE USING (
    idea_bank_id IN (SELECT id FROM idea_banks WHERE
      project_id IN (SELECT id FROM projects WHERE user_id = auth.uid() AND deleted_at IS NULL)
    )
  );

CREATE POLICY "idea_slots_delete" ON idea_slots
  FOR DELETE USING (
    idea_bank_id IN (SELECT id FROM idea_banks WHERE
      project_id IN (SELECT id FROM projects WHERE user_id = auth.uid() AND deleted_at IS NULL)
    )
  );

CREATE INDEX idx_idea_slots_bank ON idea_slots(idea_bank_id);
CREATE INDEX idx_idea_slots_parent ON idea_slots(parent_slot_id);

CREATE OR REPLACE FUNCTION update_idea_slots_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_idea_slots_updated_at
  BEFORE UPDATE ON idea_slots
  FOR EACH ROW
  EXECUTE FUNCTION update_idea_slots_updated_at();


-- Idea cards (competing ideas within a slot)
CREATE TABLE IF NOT EXISTS idea_cards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slot_id UUID NOT NULL REFERENCES idea_slots(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  summary TEXT,
  content TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'finalized', 'dimmed', 'archived')),
  position INTEGER NOT NULL DEFAULT 0,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

ALTER TABLE idea_cards ENABLE ROW LEVEL SECURITY;

-- idea_cards: visible to project owner + project collaborators
-- idea_bank_collaborators will be added in migration 00006
CREATE POLICY "idea_cards_select" ON idea_cards
  FOR SELECT USING (
    slot_id IN (
      SELECT is2.id FROM idea_slots is2
      JOIN idea_banks ib ON is2.idea_bank_id = ib.id
      WHERE
        ib.project_id IN (SELECT id FROM projects WHERE user_id = auth.uid() AND deleted_at IS NULL)
        OR ib.project_id IN (
          SELECT pc.project_id FROM project_collaborators pc
          WHERE pc.user_id = auth.uid() AND pc.status = 'active'
        )
    )
  );

CREATE POLICY "idea_cards_insert" ON idea_cards
  FOR INSERT WITH CHECK (
    slot_id IN (
      SELECT is2.id FROM idea_slots is2
      JOIN idea_banks ib ON is2.idea_bank_id = ib.id
      WHERE ib.project_id IN (SELECT id FROM projects WHERE user_id = auth.uid() AND deleted_at IS NULL)
    )
  );

CREATE POLICY "idea_cards_update" ON idea_cards
  FOR UPDATE USING (
    slot_id IN (
      SELECT is2.id FROM idea_slots is2
      JOIN idea_banks ib ON is2.idea_bank_id = ib.id
      WHERE ib.project_id IN (SELECT id FROM projects WHERE user_id = auth.uid() AND deleted_at IS NULL)
    )
  );

CREATE POLICY "idea_cards_delete" ON idea_cards
  FOR DELETE USING (
    slot_id IN (
      SELECT is2.id FROM idea_slots is2
      JOIN idea_banks ib ON is2.idea_bank_id = ib.id
      WHERE ib.project_id IN (SELECT id FROM projects WHERE user_id = auth.uid() AND deleted_at IS NULL)
    )
  );

CREATE INDEX idx_idea_cards_slot ON idea_cards(slot_id);
CREATE INDEX idx_idea_cards_status ON idea_cards(status);
CREATE INDEX idx_idea_cards_created_by ON idea_cards(created_by);

CREATE OR REPLACE FUNCTION update_idea_cards_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_idea_cards_updated_at
  BEFORE UPDATE ON idea_cards
  FOR EACH ROW
  EXECUTE FUNCTION update_idea_cards_updated_at();