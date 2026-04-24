/*
  # Create Plot System (خط الحبكة)
  
  1. New Tables
    - `plot_projects` - One plot project per writing project
      - `id` (uuid, primary key)
      - `project_id` (uuid, unique, foreign key to projects.id)
      - `executed` (boolean, default false)
      - `last_analysis_at` (timestamptz, nullable)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
    
    - `plot_chapters` - Plot chapters (فصول خط الحبكة)
      - `id` (uuid, primary key)
      - `plot_project_id` (uuid, foreign key to plot_projects.id)
      - `order_index` (integer)
      - `title` (text)
      - `summary` (text)
      - `goal` (text, nullable)
      - `tension_level` (integer, nullable, 1-10)
      - `pace_level` (integer, nullable, 1-10)
      - `has_climax` (boolean, default false)
      - `system_notes` (text, nullable)
      - `user_notes` (text, nullable)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
    
    - `plot_scenes` - Plot scenes (مشاهد خط الحبكة)
      - `id` (uuid, primary key)
      - `chapter_id` (uuid, foreign key to plot_chapters.id)
      - `order_index` (integer)
      - `title` (text)
      - `summary` (text)
      - `tension_level` (integer, nullable, 1-10)
      - `pace_level` (integer, nullable, 1-10)
      - `has_climax` (boolean, default false)
      - `system_notes` (text, nullable)
      - `user_notes` (text, nullable)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
    
    - `plot_analysis` - Plot analysis results (تحليل خط الحبكة)
      - `id` (uuid, primary key)
      - `plot_project_id` (uuid, unique, foreign key to plot_projects.id)
      - `analysis_json` (jsonb)
      - `quality_score` (integer, 0-100)
      - `created_at` (timestamptz)
  
  2. Security
    - Enable RLS on all tables
    - Users can only access their own plot data
    - All foreign keys with CASCADE delete
  
  3. Performance
    - Indexes on foreign keys
    - Indexes on order_index columns
    - Indexes on plot_project_id for faster lookups
*/

-- ============================================================================
-- 1. CREATE TABLES
-- ============================================================================

-- Plot Projects Table (one per writing project)
CREATE TABLE IF NOT EXISTS plot_projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid UNIQUE NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  executed boolean DEFAULT false,
  last_analysis_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Plot Chapters Table
CREATE TABLE IF NOT EXISTS plot_chapters (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plot_project_id uuid NOT NULL REFERENCES plot_projects(id) ON DELETE CASCADE,
  order_index integer NOT NULL CHECK (order_index > 0),
  title text NOT NULL,
  summary text NOT NULL DEFAULT '',
  goal text,
  tension_level integer CHECK (tension_level >= 1 AND tension_level <= 10),
  pace_level integer CHECK (pace_level >= 1 AND pace_level <= 10),
  has_climax boolean DEFAULT false,
  system_notes text,
  user_notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(plot_project_id, order_index)
);

-- Plot Scenes Table
CREATE TABLE IF NOT EXISTS plot_scenes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  chapter_id uuid NOT NULL REFERENCES plot_chapters(id) ON DELETE CASCADE,
  order_index integer NOT NULL CHECK (order_index > 0),
  title text NOT NULL,
  summary text NOT NULL DEFAULT '',
  tension_level integer CHECK (tension_level >= 1 AND tension_level <= 10),
  pace_level integer CHECK (pace_level >= 1 AND pace_level <= 10),
  has_climax boolean DEFAULT false,
  system_notes text,
  user_notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(chapter_id, order_index)
);

-- Plot Analysis Table (one per plot project)
CREATE TABLE IF NOT EXISTS plot_analysis (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plot_project_id uuid UNIQUE NOT NULL REFERENCES plot_projects(id) ON DELETE CASCADE,
  analysis_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  quality_score integer CHECK (quality_score >= 0 AND quality_score <= 100),
  created_at timestamptz DEFAULT now()
);

-- ============================================================================
-- 2. CREATE INDEXES FOR PERFORMANCE
-- ============================================================================

-- Foreign key indexes
CREATE INDEX IF NOT EXISTS idx_plot_projects_project_id ON plot_projects(project_id);
CREATE INDEX IF NOT EXISTS idx_plot_chapters_plot_project_id ON plot_chapters(plot_project_id);
CREATE INDEX IF NOT EXISTS idx_plot_scenes_chapter_id ON plot_scenes(chapter_id);
CREATE INDEX IF NOT EXISTS idx_plot_analysis_plot_project_id ON plot_analysis(plot_project_id);

-- Order indexes for sorting
CREATE INDEX IF NOT EXISTS idx_plot_chapters_order ON plot_chapters(plot_project_id, order_index);
CREATE INDEX IF NOT EXISTS idx_plot_scenes_order ON plot_scenes(chapter_id, order_index);

-- Analysis timestamp index
CREATE INDEX IF NOT EXISTS idx_plot_projects_last_analysis ON plot_projects(last_analysis_at);

-- ============================================================================
-- 3. ENABLE ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE plot_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE plot_chapters ENABLE ROW LEVEL SECURITY;
ALTER TABLE plot_scenes ENABLE ROW LEVEL SECURITY;
ALTER TABLE plot_analysis ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- 4. CREATE RLS POLICIES
-- ============================================================================

-- Plot Projects Policies
CREATE POLICY "Users can view own plot projects"
  ON plot_projects FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = plot_projects.project_id
      AND projects.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert own plot projects"
  ON plot_projects FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = plot_projects.project_id
      AND projects.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update own plot projects"
  ON plot_projects FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = plot_projects.project_id
      AND projects.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = plot_projects.project_id
      AND projects.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete own plot projects"
  ON plot_projects FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = plot_projects.project_id
      AND projects.user_id = auth.uid()
    )
  );

-- Plot Chapters Policies
CREATE POLICY "Users can view own plot chapters"
  ON plot_chapters FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM plot_projects
      JOIN projects ON projects.id = plot_projects.project_id
      WHERE plot_projects.id = plot_chapters.plot_project_id
      AND projects.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert own plot chapters"
  ON plot_chapters FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM plot_projects
      JOIN projects ON projects.id = plot_projects.project_id
      WHERE plot_projects.id = plot_chapters.plot_project_id
      AND projects.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update own plot chapters"
  ON plot_chapters FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM plot_projects
      JOIN projects ON projects.id = plot_projects.project_id
      WHERE plot_projects.id = plot_chapters.plot_project_id
      AND projects.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM plot_projects
      JOIN projects ON projects.id = plot_projects.project_id
      WHERE plot_projects.id = plot_chapters.plot_project_id
      AND projects.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete own plot chapters"
  ON plot_chapters FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM plot_projects
      JOIN projects ON projects.id = plot_projects.project_id
      WHERE plot_projects.id = plot_chapters.plot_project_id
      AND projects.user_id = auth.uid()
    )
  );

-- Plot Scenes Policies
CREATE POLICY "Users can view own plot scenes"
  ON plot_scenes FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM plot_chapters
      JOIN plot_projects ON plot_projects.id = plot_chapters.plot_project_id
      JOIN projects ON projects.id = plot_projects.project_id
      WHERE plot_chapters.id = plot_scenes.chapter_id
      AND projects.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert own plot scenes"
  ON plot_scenes FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM plot_chapters
      JOIN plot_projects ON plot_projects.id = plot_chapters.plot_project_id
      JOIN projects ON projects.id = plot_projects.project_id
      WHERE plot_chapters.id = plot_scenes.chapter_id
      AND projects.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update own plot scenes"
  ON plot_scenes FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM plot_chapters
      JOIN plot_projects ON plot_projects.id = plot_chapters.plot_project_id
      JOIN projects ON projects.id = plot_projects.project_id
      WHERE plot_chapters.id = plot_scenes.chapter_id
      AND projects.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM plot_chapters
      JOIN plot_projects ON plot_projects.id = plot_chapters.plot_project_id
      JOIN projects ON projects.id = plot_projects.project_id
      WHERE plot_chapters.id = plot_scenes.chapter_id
      AND projects.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete own plot scenes"
  ON plot_scenes FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM plot_chapters
      JOIN plot_projects ON plot_projects.id = plot_chapters.plot_project_id
      JOIN projects ON projects.id = plot_projects.project_id
      WHERE plot_chapters.id = plot_scenes.chapter_id
      AND projects.user_id = auth.uid()
    )
  );

-- Plot Analysis Policies
CREATE POLICY "Users can view own plot analysis"
  ON plot_analysis FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM plot_projects
      JOIN projects ON projects.id = plot_projects.project_id
      WHERE plot_projects.id = plot_analysis.plot_project_id
      AND projects.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert own plot analysis"
  ON plot_analysis FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM plot_projects
      JOIN projects ON projects.id = plot_projects.project_id
      WHERE plot_projects.id = plot_analysis.plot_project_id
      AND projects.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update own plot analysis"
  ON plot_analysis FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM plot_projects
      JOIN projects ON projects.id = plot_projects.project_id
      WHERE plot_projects.id = plot_analysis.plot_project_id
      AND projects.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM plot_projects
      JOIN projects ON projects.id = plot_projects.project_id
      WHERE plot_projects.id = plot_analysis.plot_project_id
      AND projects.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete own plot analysis"
  ON plot_analysis FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM plot_projects
      JOIN projects ON projects.id = plot_projects.project_id
      WHERE plot_projects.id = plot_analysis.plot_project_id
      AND projects.user_id = auth.uid()
    )
  );

-- ============================================================================
-- 5. CREATE HELPER FUNCTIONS
-- ============================================================================

-- Function to automatically create plot_project when a new project is created
CREATE OR REPLACE FUNCTION create_plot_project_for_new_project()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO plot_projects (project_id)
  VALUES (NEW.id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to auto-create plot_project
DROP TRIGGER IF EXISTS trigger_create_plot_project ON projects;
CREATE TRIGGER trigger_create_plot_project
  AFTER INSERT ON projects
  FOR EACH ROW
  EXECUTE FUNCTION create_plot_project_for_new_project();

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_plot_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
DROP TRIGGER IF EXISTS trigger_plot_projects_updated_at ON plot_projects;
CREATE TRIGGER trigger_plot_projects_updated_at
  BEFORE UPDATE ON plot_projects
  FOR EACH ROW
  EXECUTE FUNCTION update_plot_updated_at();

DROP TRIGGER IF EXISTS trigger_plot_chapters_updated_at ON plot_chapters;
CREATE TRIGGER trigger_plot_chapters_updated_at
  BEFORE UPDATE ON plot_chapters
  FOR EACH ROW
  EXECUTE FUNCTION update_plot_updated_at();

DROP TRIGGER IF EXISTS trigger_plot_scenes_updated_at ON plot_scenes;
CREATE TRIGGER trigger_plot_scenes_updated_at
  BEFORE UPDATE ON plot_scenes
  FOR EACH ROW
  EXECUTE FUNCTION update_plot_updated_at();