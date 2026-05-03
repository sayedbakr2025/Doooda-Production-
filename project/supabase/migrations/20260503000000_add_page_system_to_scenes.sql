-- Add page system fields to scenes table for children's story books
ALTER TABLE scenes 
ADD COLUMN IF NOT EXISTS page_type TEXT DEFAULT 'single' CHECK (page_type IN ('single', 'double')),
ADD COLUMN IF NOT EXISTS page_group_id UUID,
ADD COLUMN IF NOT EXISTS page_order INTEGER;

-- Create index for page_group queries
CREATE INDEX IF NOT EXISTS idx_scenes_page_group ON scenes(page_group_id) WHERE page_group_id IS NOT NULL;

-- Add page_type to plot_scenes table for story outline
ALTER TABLE plot_scenes 
ADD COLUMN IF NOT EXISTS page_type TEXT DEFAULT 'single' CHECK (page_type IN ('single', 'double'));

-- Function to create double page (two scenes with same group)
CREATE OR REPLACE FUNCTION create_double_page(
  p_chapter_id uuid,
  p_title1 text,
  p_title2 text,
  p_language text DEFAULT 'en'
)
RETURNS TABLE(scene1_id uuid, scene2_id uuid, page_group uuid) AS $$
DECLARE
  v_page_group uuid := gen_random_uuid();
  v_position1 integer;
  v_position2 integer;
  v_max_position integer;
BEGIN
  -- Get max position in chapter
  SELECT COALESCE(MAX(position), 0) INTO v_max_position FROM scenes WHERE chapter_id = p_chapter_id AND deleted_at IS NULL;
  
  v_position1 := v_max_position + 1;
  v_position2 := v_max_position + 2;
  
  -- Create first scene (right for RTL, left for LTR)
  INSERT INTO scenes (chapter_id, position, title, page_type, page_group_id, page_order)
  VALUES (p_chapter_id, v_position1, p_title1, 'double', v_page_group, 
    CASE WHEN p_language = 'ar' THEN 2 ELSE 1 END)
  RETURNING id INTO scene1_id;
  
  -- Create second scene (left for RTL, right for LTR)
  INSERT INTO scenes (chapter_id, position, title, page_type, page_group_id, page_order)
  VALUES (p_chapter_id, v_position2, p_title2, 'double', v_page_group,
    CASE WHEN p_language = 'ar' THEN 1 ELSE 2 END)
  RETURNING id INTO scene2_id;
  
  RETURN;
END;
$$ LANGUAGE plpgsql;

-- Function to create single page
CREATE OR REPLACE FUNCTION create_single_page(
  p_chapter_id uuid,
  p_title text,
  p_language text DEFAULT 'en'
)
RETURNS uuid AS $$
DECLARE
  v_position integer;
  v_max_position integer;
  v_scene_id uuid;
BEGIN
  SELECT COALESCE(MAX(position), 0) INTO v_max_position FROM scenes WHERE chapter_id = p_chapter_id AND deleted_at IS NULL;
  v_position := v_max_position + 1;
  
  INSERT INTO scenes (chapter_id, position, title, page_type, page_order)
  VALUES (p_chapter_id, v_position, p_title, 'single', 1)
  RETURNING id INTO v_scene_id;
  
  RETURN v_scene_id;
END;
$$ LANGUAGE plpgsql;

-- Validation function: ensure double page has exactly 2 scenes
CREATE OR REPLACE FUNCTION validate_page_group()
RETURNS TRIGGER AS $$
DECLARE
  v_count integer;
BEGIN
  IF NEW.page_type = 'double' AND NEW.page_group_id IS NOT NULL THEN
    SELECT COUNT(*) INTO v_count FROM scenes 
    WHERE page_group_id = NEW.page_group_id AND deleted_at IS NULL;
    IF v_count > 2 THEN
      RAISE EXCEPTION 'Double page cannot have more than 2 scenes';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for validation
DROP TRIGGER IF EXISTS validate_page_group_trigger ON scenes;
CREATE CONSTRAINT TRIGGER validate_page_group_trigger
AFTER INSERT OR UPDATE ON scenes
FOR EACH ROW
EXECUTE FUNCTION validate_page_group();