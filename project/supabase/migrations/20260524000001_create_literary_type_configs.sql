-- ============================================================
-- Phase 1: Literary Type Foundation
-- Creates literary_type_configs table for dynamic hierarchy definitions.
-- This table drives both Idea Bank and future Plot hierarchy rendering.
-- NO existing tables are modified.
-- ============================================================

CREATE TABLE IF NOT EXISTS literary_type_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_type TEXT NOT NULL UNIQUE,

  -- Level 1 definition (always present: the container level)
  level_1_singular_en TEXT NOT NULL,
  level_1_singular_ar TEXT NOT NULL,
  level_1_plural_en TEXT NOT NULL,
  level_1_plural_ar TEXT NOT NULL,
  level_1_icon TEXT NOT NULL DEFAULT '📄',

  -- Level 2 definition (NULL if has_level_2 is false)
  level_2_singular_en TEXT,
  level_2_singular_ar TEXT,
  level_2_plural_en TEXT,
  level_2_plural_ar TEXT,
  level_2_icon TEXT,

  -- Structural flags
  has_level_2 BOOLEAN NOT NULL DEFAULT true,
  has_script_fields BOOLEAN NOT NULL DEFAULT false,
  has_sound_fields BOOLEAN NOT NULL DEFAULT false,
  has_children_fields BOOLEAN NOT NULL DEFAULT false,

  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE literary_type_configs ENABLE ROW LEVEL SECURITY;

-- Anyone can read literary type configs (they're configuration, not user data)
CREATE POLICY "literary_type_configs_read_all" ON literary_type_configs
  FOR SELECT USING (true);

-- Only admins can modify
CREATE POLICY "literary_type_configs_admin_insert" ON literary_type_configs
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "literary_type_configs_admin_update" ON literary_type_configs
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "literary_type_configs_admin_delete" ON literary_type_configs
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
  );

-- Index on project_type for fast lookups
CREATE INDEX idx_literary_type_configs_project_type ON literary_type_configs(project_type);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_literary_type_configs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_literary_type_configs_updated_at
  BEFORE UPDATE ON literary_type_configs
  FOR EACH ROW
  EXECUTE FUNCTION update_literary_type_configs_updated_at();