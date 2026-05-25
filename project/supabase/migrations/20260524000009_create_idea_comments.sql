-- ============================================================
-- Phase 7: Idea Bank Comments
-- Creates idea_comments table with RLS
-- NO modifications to existing tables.
-- ============================================================

CREATE TABLE IF NOT EXISTS idea_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  idea_bank_id UUID NOT NULL REFERENCES idea_banks(id) ON DELETE CASCADE,
  idea_card_id UUID NOT NULL REFERENCES idea_cards(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id),
  content TEXT NOT NULL CHECK (length(trim(content)) > 0),
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'resolved')),
  parent_id UUID REFERENCES idea_comments(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

ALTER TABLE idea_comments ENABLE ROW LEVEL SECURITY;

-- Select: owner, project collaborators, idea bank collaborators
CREATE POLICY "idea_comments_select" ON idea_comments
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
    AND deleted_at IS NULL
  );

-- Insert: owner, project editors, idea bank editors
CREATE POLICY "idea_comments_insert" ON idea_comments
  FOR INSERT WITH CHECK (
    idea_bank_id IN (SELECT id FROM idea_banks WHERE
      project_id IN (SELECT id FROM projects WHERE user_id = auth.uid() AND deleted_at IS NULL)
      OR id IN (
        SELECT ibc.idea_bank_id FROM idea_bank_collaborators ibc
        WHERE ibc.user_id = auth.uid() AND ibc.role IN ('editor', 'owner') AND ibc.status = 'active'
      )
    )
  );

-- Update: comment author or owner/editor
CREATE POLICY "idea_comments_update" ON idea_comments
  FOR UPDATE USING (
    user_id = auth.uid()
    OR idea_bank_id IN (SELECT id FROM idea_banks WHERE
      project_id IN (SELECT id FROM projects WHERE user_id = auth.uid() AND deleted_at IS NULL)
      OR id IN (
        SELECT ibc.idea_bank_id FROM idea_bank_collaborators ibc
        WHERE ibc.user_id = auth.uid() AND ibc.role IN ('editor', 'owner') AND ibc.status = 'active'
      )
    )
  );

-- Delete: comment author or owner/editor
CREATE POLICY "idea_comments_delete" ON idea_comments
  FOR DELETE USING (
    user_id = auth.uid()
    OR idea_bank_id IN (SELECT id FROM idea_banks WHERE
      project_id IN (SELECT id FROM projects WHERE user_id = auth.uid() AND deleted_at IS NULL)
      OR id IN (
        SELECT ibc.idea_bank_id FROM idea_bank_collaborators ibc
        WHERE ibc.user_id = auth.uid() AND ibc.role IN ('editor', 'owner') AND ibc.status = 'active'
      )
    )
  );

CREATE INDEX idx_idea_comments_card ON idea_comments(idea_card_id);
CREATE INDEX idx_idea_comments_bank ON idea_comments(idea_bank_id);
CREATE INDEX idx_idea_comments_parent ON idea_comments(parent_id);
CREATE INDEX idx_idea_comments_user ON idea_comments(user_id);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_idea_comments_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_idea_comments_updated_at
  BEFORE UPDATE ON idea_comments
  FOR EACH ROW
  EXECUTE FUNCTION update_idea_comments_updated_at();