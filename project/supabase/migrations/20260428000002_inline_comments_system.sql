/*
  # Inline Comments System

  ## Tables
  1. inline_comments — anchors text selections with comment threads
  2. inline_comment_replies — threaded replies

  ## RLS
  - Project collaborators and owners can view/add comments
  - Only comment author or project owner can delete

  ## Indexes
  - project_id, scene_id for fast lookups
  - user_id for user queries
*/

-- ═══════════════════════════════════════════
-- 1. inline_comments table
-- ═══════════════════════════════════════════
CREATE TABLE IF NOT EXISTS inline_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  scene_id uuid NOT NULL REFERENCES scenes(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content text NOT NULL,
  anchor_start integer,
  anchor_end integer,
  selected_text text,
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'resolved')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_inline_comments_project ON inline_comments(project_id);
CREATE INDEX IF NOT EXISTS idx_inline_comments_scene ON inline_comments(scene_id);
CREATE INDEX IF NOT EXISTS idx_inline_comments_user ON inline_comments(user_id);

ALTER TABLE inline_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Collaborators and owners can view inline comments" ON inline_comments
  FOR SELECT USING (
    project_id IN (
      SELECT p.id FROM projects p WHERE p.user_id = auth.uid()
      UNION
      SELECT pc.project_id FROM project_collaborators pc
      WHERE pc.user_id = auth.uid() AND pc.status = 'active'
    )
  );

CREATE POLICY "Collaborators and owners can insert inline comments" ON inline_comments
  FOR INSERT WITH CHECK (
    user_id = auth.uid() AND (
      project_id IN (
        SELECT p.id FROM projects p WHERE p.user_id = auth.uid()
        UNION
        SELECT pc.project_id FROM project_collaborators pc
        WHERE pc.user_id = auth.uid() AND pc.status = 'active'
      )
    )
  );

CREATE POLICY "Comment author or project owner can update" ON inline_comments
  FOR UPDATE USING (
    user_id = auth.uid() OR
    project_id IN (SELECT p.id FROM projects p WHERE p.user_id = auth.uid())
  );

CREATE POLICY "Comment author or project owner can delete" ON inline_comments
  FOR DELETE USING (
    user_id = auth.uid() OR
    project_id IN (SELECT p.id FROM projects p WHERE p.user_id = auth.uid())
  );

-- ═══════════════════════════════════════════
-- 2. inline_comment_replies table
-- ═══════════════════════════════════════════
CREATE TABLE IF NOT EXISTS inline_comment_replies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  comment_id uuid NOT NULL REFERENCES inline_comments(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_inline_comment_replies_comment ON inline_comment_replies(comment_id);

ALTER TABLE inline_comment_replies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Collaborators can view replies" ON inline_comment_replies
  FOR SELECT USING (
    comment_id IN (
      SELECT ic.id FROM inline_comments ic
      WHERE ic.project_id IN (
        SELECT p.id FROM projects p WHERE p.user_id = auth.uid()
        UNION
        SELECT pc.project_id FROM project_collaborators pc
        WHERE pc.user_id = auth.uid() AND pc.status = 'active'
      )
    )
  );

CREATE POLICY "Collaborators can insert replies" ON inline_comment_replies
  FOR INSERT WITH CHECK (
    user_id = auth.uid() AND
    comment_id IN (
      SELECT ic.id FROM inline_comments ic
      WHERE ic.project_id IN (
        SELECT p.id FROM projects p WHERE p.user_id = auth.uid()
        UNION
        SELECT pc.project_id FROM project_collaborators pc
        WHERE pc.user_id = auth.uid() AND pc.status = 'active'
      )
    )
  );

CREATE POLICY "Reply author or project owner can delete" ON inline_comment_replies
  FOR DELETE USING (
    user_id = auth.uid() OR
    comment_id IN (
      SELECT ic.id FROM inline_comments ic
      WHERE ic.project_id IN (SELECT p.id FROM projects p WHERE p.user_id = auth.uid())
    )
  );

-- ═══════════════════════════════════════════
-- 3. Helper: resolve user display name for queries
-- ═══════════════════════════════════════════
CREATE OR REPLACE FUNCTION get_inline_comments_with_authors(p_scene_id uuid)
RETURNS TABLE (
  id uuid,
  project_id uuid,
  scene_id uuid,
  user_id uuid,
  content text,
  anchor_start integer,
  anchor_end integer,
  selected_text text,
  status text,
  created_at timestamptz,
  updated_at timestamptz,
  author_name text,
  author_email text,
  reply_count bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
BEGIN
  RETURN QUERY
  SELECT
    ic.id,
    ic.project_id,
    ic.scene_id,
    ic.user_id,
    ic.content,
    ic.anchor_start,
    ic.anchor_end,
    ic.selected_text,
    ic.status,
    ic.created_at,
    ic.updated_at,
    COALESCE(u.pen_name, u.first_name, split_part(u.email, '@', 1)) AS author_name,
    u.email AS author_email,
    (SELECT COUNT(*) FROM inline_comment_replies r WHERE r.comment_id = ic.id AND r.deleted_at IS NULL) AS reply_count
  FROM inline_comments ic
  JOIN users u ON u.id = ic.user_id
  WHERE ic.scene_id = p_scene_id
    AND ic.deleted_at IS NULL
  ORDER BY ic.created_at ASC;
END;
$$;

GRANT EXECUTE ON FUNCTION get_inline_comments_with_authors(uuid) TO postgres, authenticated, service_role;