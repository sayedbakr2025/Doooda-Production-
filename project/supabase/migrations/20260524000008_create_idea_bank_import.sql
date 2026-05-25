-- ============================================================
-- Phase 6: Idea Bank → Plot Import
-- Creates idea_bank_imports table for audit trail
-- Creates import_idea_bank_to_plot() DB function
-- NO modifications to existing tables.
-- ============================================================

-- Audit table for idea bank imports
CREATE TABLE IF NOT EXISTS idea_bank_imports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  idea_bank_id UUID NOT NULL REFERENCES idea_banks(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  imported_by UUID NOT NULL REFERENCES users(id),
  chapters_created INTEGER NOT NULL DEFAULT 0,
  scenes_created INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'completed' CHECK (status IN ('completed', 'failed')),
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE idea_bank_imports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "idea_bank_imports_select" ON idea_bank_imports
  FOR SELECT USING (
    project_id IN (SELECT id FROM projects WHERE user_id = auth.uid() AND deleted_at IS NULL)
  );

CREATE POLICY "idea_bank_imports_insert" ON idea_bank_imports
  FOR INSERT WITH CHECK (
    project_id IN (SELECT id FROM projects WHERE user_id = auth.uid() AND deleted_at IS NULL)
  );

CREATE INDEX idx_idea_bank_imports_bank ON idea_bank_imports(idea_bank_id);
CREATE INDEX idx_idea_bank_imports_project ON idea_bank_imports(project_id);

-- ============================================================
-- import_idea_bank_to_plot()
-- Destructive overwrite: deletes existing plot data, creates new from idea bank
-- SECURITY DEFINER with SET search_path = public
-- Only project owner can execute
-- Validates that every slot has a finalized idea
-- ============================================================
CREATE OR REPLACE FUNCTION import_idea_bank_to_plot(
  p_idea_bank_id UUID,
  p_project_id UUID,
  p_user_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_plot_project_id UUID;
  v_chapters_created INTEGER := 0;
  v_scenes_created INTEGER := 0;
  v_level1_slots RECORD;
  v_level2_slots RECORD;
  v_finalized_idea RECORD;
  v_chapter_id UUID;
  v_unresolved_count INTEGER;
  v_highest_level INTEGER;
  v_project_type TEXT;
BEGIN
  -- Validate ownership
  IF NOT EXISTS (
    SELECT 1 FROM public.projects
    WHERE id = p_project_id AND user_id = p_user_id AND deleted_at IS NULL
  ) THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Only the project owner can import ideas to plot'
    );
  END IF;

  -- Validate idea bank belongs to project
  IF NOT EXISTS (
    SELECT 1 FROM public.idea_banks
    WHERE id = p_idea_bank_id AND project_id = p_project_id
  ) THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Idea bank does not belong to this project'
    );
  END IF;

  -- Check that all slots have at least one finalized idea
  SELECT COUNT(*) INTO v_unresolved_count
  FROM public.idea_slots s
  WHERE s.idea_bank_id = p_idea_bank_id
    AND NOT EXISTS (
      SELECT 1 FROM public.idea_cards c
      WHERE c.slot_id = s.id AND c.status = 'finalized' AND c.deleted_at IS NULL
    );

  IF v_unresolved_count > 0 THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', format('Cannot import: %s slots have no finalized idea', v_unresolved_count)
    );
  END IF;

  -- Get or create plot_project
  SELECT id INTO v_plot_project_id
  FROM public.plot_projects
  WHERE project_id = p_project_id;

  IF v_plot_project_id IS NULL THEN
    INSERT INTO public.plot_projects (project_id, executed)
    VALUES (p_project_id, false)
    RETURNING id INTO v_plot_project_id;
  END IF;

  -- Check if plot is already executed
  IF EXISTS (SELECT 1 FROM public.plot_projects WHERE id = v_plot_project_id AND executed = true) THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Plot has already been executed. Cannot import over an executed plot.'
    );
  END IF;

  -- Delete existing plot chapters (cascades to plot_scenes)
  DELETE FROM public.plot_chapters WHERE plot_project_id = v_plot_project_id;

  -- Determine hierarchy: get highest level and project type
  SELECT MAX(level) INTO v_highest_level
  FROM public.idea_slots
  WHERE idea_bank_id = p_idea_bank_id;

  SELECT project_type INTO v_project_type
  FROM public.projects WHERE id = p_project_id;

  -- Handle single-level hierarchy (e.g., film_script, short_story)
  -- Level-1 slots become plot_scenes directly (no chapters)
  IF v_highest_level = 1 THEN
    FOR v_level1_slots IN
      SELECT s.id AS slot_id, s.title AS slot_title, s.position,
             c.title AS idea_title, c.summary AS idea_summary, c.content AS idea_content
      FROM public.idea_slots s
      LEFT JOIN public.idea_cards c ON c.slot_id = s.id AND c.status = 'finalized' AND c.deleted_at IS NULL
      WHERE s.idea_bank_id = p_idea_bank_id AND s.level = 1
      ORDER BY s.position
    LOOP
      -- Create a single chapter per slot, then a single scene
      INSERT INTO public.plot_chapters (plot_project_id, order_index, title, summary)
      VALUES (
        v_plot_project_id,
        v_level1_slots.position + 1,
        COALESCE(v_level1_slots.idea_title, v_level1_slots.slot_title, 'Untitled'),
        COALESCE(v_level1_slots.idea_summary, '')
      )
      RETURNING id INTO v_chapter_id;

      v_chapters_created := v_chapters_created + 1;

      INSERT INTO public.plot_scenes (chapter_id, order_index, title, summary, hook, page_type)
      VALUES (
        v_chapter_id,
        1,
        COALESCE(v_level1_slots.idea_title, v_level1_slots.slot_title, 'Untitled'),
        COALESCE(v_level1_slots.idea_summary, v_level1_slots.idea_content, ''),
        '',
        CASE WHEN v_project_type = 'children_story' THEN 'single' ELSE NULL END
      );

      v_scenes_created := v_scenes_created + 1;
    END LOOP;
  ELSE
    -- Two-level hierarchy (e.g., novel, book)
    -- Level-1 slots become chapters, level-2 slots become scenes
    FOR v_level1_slots IN
      SELECT s.id AS slot_id, s.title AS slot_title, s.position,
             c.title AS idea_title, c.summary AS idea_summary
      FROM public.idea_slots s
      LEFT JOIN public.idea_cards c ON c.slot_id = s.id AND c.status = 'finalized' AND c.deleted_at IS NULL
      WHERE s.idea_bank_id = p_idea_bank_id AND s.level = 1
      ORDER BY s.position
    LOOP
      INSERT INTO public.plot_chapters (plot_project_id, order_index, title, summary)
      VALUES (
        v_plot_project_id,
        v_level1_slots.position + 1,
        COALESCE(v_level1_slots.idea_title, v_level1_slots.slot_title, 'Untitled'),
        COALESCE(v_level1_slots.idea_summary, '')
      )
      RETURNING id INTO v_chapter_id;

      v_chapters_created := v_chapters_created + 1;

      -- Create scenes from level-2 slots under this chapter
      FOR v_level2_slots IN
        SELECT s2.id AS slot_id, s2.title AS slot_title, s2.position,
               c2.title AS idea_title, c2.summary AS idea_summary, c2.content AS idea_content
        FROM public.idea_slots s2
        LEFT JOIN public.idea_cards c2 ON c2.slot_id = s2.id AND c2.status = 'finalized' AND c2.deleted_at IS NULL
        WHERE s2.parent_slot_id = v_level1_slots.slot_id AND s2.level = 2
        ORDER BY s2.position
      LOOP
        INSERT INTO public.plot_scenes (chapter_id, order_index, title, summary, hook)
        VALUES (
          v_chapter_id,
          v_level2_slots.position + 1,
          COALESCE(v_level2_slots.idea_title, v_level2_slots.slot_title, 'Untitled'),
          COALESCE(v_level2_slots.idea_summary, v_level2_slots.idea_content, ''),
          ''
        );

        v_scenes_created := v_scenes_created + 1;
      END LOOP;
    END LOOP;
  END IF;

  -- Log the import
  INSERT INTO public.idea_bank_imports (idea_bank_id, project_id, imported_by, chapters_created, scenes_created)
  VALUES (p_idea_bank_id, p_project_id, p_user_id, v_chapters_created, v_scenes_created);

  RETURN jsonb_build_object(
    'success', true,
    'chapters_created', v_chapters_created,
    'scenes_created', v_scenes_created
  );
EXCEPTION WHEN OTHERS THEN
  -- Log the failure
  INSERT INTO public.idea_bank_imports (idea_bank_id, project_id, imported_by, chapters_created, scenes_created, status, error_message)
  VALUES (p_idea_bank_id, p_project_id, p_user_id, 0, 0, 'failed', SQLERRM);

  RETURN jsonb_build_object(
    'success', false,
    'error', SQLERRM
  );
END;
$$;