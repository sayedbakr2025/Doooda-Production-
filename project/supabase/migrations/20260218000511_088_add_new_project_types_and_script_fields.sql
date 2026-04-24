/*
  # Add New Professional Writing Project Types

  ## Summary
  Extends Doooda to support professional scriptwriting formats alongside existing narrative formats.

  ## Changes

  ### 1. Project Types Extension
  - Adds new project_type values: film_script, tv_series, theatre_play, radio_series, children_story
  - Uses DO block to safely alter the enum without breaking existing data

  ### 2. New Table: project_type_settings (Admin-controlled)
  - Allows admins to enable/disable project types per plan
  - Stores AI model override per project type

  ### 3. New Columns on scenes table
  - scene_type: INT/EXT for film/TV scripts
  - time_of_day: DAY/NIGHT/etc for film/TV
  - location: physical location for script scenes
  - camera_shot: shot type (CLOSE-UP, WIDE, etc.) optional
  - camera_angle: angle optional
  - background_sound: for radio series
  - sound_cues: JSONB array for radio cues
  - voice_tone: for radio character tags
  - has_silence_marker: boolean for radio
  - page_number: for children story spread layout
  - reading_complexity_score: 0-100 for children story

  ### 4. Security
  - RLS enabled on project_type_settings
  - Admin-only write, all authenticated read
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type WHERE typname = 'project_type_enum'
  ) THEN
    CREATE TYPE project_type_enum AS ENUM (
      'novel', 'short_story', 'long_story', 'book',
      'film_script', 'tv_series', 'theatre_play', 'radio_series', 'children_story'
    );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum
    WHERE enumlabel = 'film_script'
    AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'project_type_enum')
  ) THEN
    ALTER TYPE project_type_enum ADD VALUE IF NOT EXISTS 'film_script';
  END IF;
END $$;

ALTER TABLE projects
  ALTER COLUMN project_type TYPE text;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.check_constraints
    WHERE constraint_name = 'projects_project_type_check'
  ) THEN
    ALTER TABLE projects
      ADD CONSTRAINT projects_project_type_check
      CHECK (project_type IN (
        'novel', 'short_story', 'long_story', 'book',
        'film_script', 'tv_series', 'theatre_play', 'radio_series', 'children_story'
      ));
  ELSE
    ALTER TABLE projects DROP CONSTRAINT projects_project_type_check;
    ALTER TABLE projects
      ADD CONSTRAINT projects_project_type_check
      CHECK (project_type IN (
        'novel', 'short_story', 'long_story', 'book',
        'film_script', 'tv_series', 'theatre_play', 'radio_series', 'children_story'
      ));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'scenes' AND column_name = 'scene_type'
  ) THEN
    ALTER TABLE scenes ADD COLUMN scene_type text DEFAULT NULL
      CHECK (scene_type IS NULL OR scene_type IN ('INT', 'EXT', 'INT/EXT'));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'scenes' AND column_name = 'time_of_day'
  ) THEN
    ALTER TABLE scenes ADD COLUMN time_of_day text DEFAULT NULL
      CHECK (time_of_day IS NULL OR time_of_day IN ('DAY', 'NIGHT', 'DAWN', 'DUSK', 'CONTINUOUS', 'LATER'));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'scenes' AND column_name = 'location'
  ) THEN
    ALTER TABLE scenes ADD COLUMN location text DEFAULT NULL;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'scenes' AND column_name = 'camera_shot'
  ) THEN
    ALTER TABLE scenes ADD COLUMN camera_shot text DEFAULT NULL;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'scenes' AND column_name = 'camera_angle'
  ) THEN
    ALTER TABLE scenes ADD COLUMN camera_angle text DEFAULT NULL;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'scenes' AND column_name = 'background_sound'
  ) THEN
    ALTER TABLE scenes ADD COLUMN background_sound text DEFAULT NULL;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'scenes' AND column_name = 'sound_cues'
  ) THEN
    ALTER TABLE scenes ADD COLUMN sound_cues jsonb DEFAULT '[]'::jsonb;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'scenes' AND column_name = 'voice_tone'
  ) THEN
    ALTER TABLE scenes ADD COLUMN voice_tone text DEFAULT NULL;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'scenes' AND column_name = 'has_silence_marker'
  ) THEN
    ALTER TABLE scenes ADD COLUMN has_silence_marker boolean DEFAULT false;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'scenes' AND column_name = 'page_number'
  ) THEN
    ALTER TABLE scenes ADD COLUMN page_number integer DEFAULT NULL;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'scenes' AND column_name = 'reading_complexity_score'
  ) THEN
    ALTER TABLE scenes ADD COLUMN reading_complexity_score integer DEFAULT NULL
      CHECK (reading_complexity_score IS NULL OR (reading_complexity_score >= 0 AND reading_complexity_score <= 100));
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS project_type_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_type text NOT NULL UNIQUE,
  is_enabled boolean DEFAULT true,
  ai_model_override text DEFAULT NULL,
  display_name_ar text NOT NULL,
  display_name_en text NOT NULL,
  icon text DEFAULT NULL,
  description_ar text DEFAULT NULL,
  description_en text DEFAULT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE project_type_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read project type settings"
  ON project_type_settings FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can insert project type settings"
  ON project_type_settings FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

CREATE POLICY "Admins can update project type settings"
  ON project_type_settings FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

INSERT INTO project_type_settings (project_type, is_enabled, display_name_ar, display_name_en, icon, description_ar, description_en)
VALUES
  ('novel', true, 'رواية', 'Novel', '📖', 'رواية أدبية كاملة', 'Full literary novel'),
  ('short_story', true, 'قصة قصيرة', 'Short Story', '📝', 'قصة قصيرة', 'Short fiction story'),
  ('long_story', true, 'قصة طويلة', 'Long Story', '📃', 'قصة طويلة', 'Long fiction story'),
  ('book', true, 'كتاب', 'Book', '📚', 'كتاب غير روائي', 'Non-fiction book'),
  ('film_script', true, 'سيناريو فيلم', 'Film Script', '🎬', 'سيناريو سينمائي باحترافية', 'Professional film screenplay'),
  ('tv_series', true, 'مسلسل تلفزيوني', 'TV Series', '📺', 'مسلسل بحلقات وفصول', 'TV series with episodes'),
  ('theatre_play', true, 'مسرحية', 'Theatre Play', '🎭', 'مسرحية بفصول ومشاهد', 'Theatre play with acts and scenes'),
  ('radio_series', true, 'مسلسل إذاعي', 'Radio Series', '📻', 'مسلسل إذاعي بمؤثرات صوتية', 'Radio series with sound cues'),
  ('children_story', true, 'قصة أطفال', 'Children Story', '🧒', 'قصة أطفال بصفحات مزدوجة', 'Children story with dual-page layout')
ON CONFLICT (project_type) DO NOTHING;

CREATE INDEX IF NOT EXISTS idx_project_type_settings_type ON project_type_settings(project_type);
CREATE INDEX IF NOT EXISTS idx_scenes_scene_type ON scenes(scene_type) WHERE scene_type IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_scenes_location ON scenes(location) WHERE location IS NOT NULL;
