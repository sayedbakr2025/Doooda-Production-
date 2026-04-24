/*
  # Add AI Score Columns to plot_scenes

  1. Changes
    - Add ai_tension column (0.0 to 1.0) to store AI's evaluation of tension
    - Add ai_pace column (0.0 to 1.0) to store AI's evaluation of pace
    - Add accuracy_score column (0.0 to 1.0) to store how well scene matches writer expectations
    - Add causality_score column (0.0 to 1.0) to store causality strength
    - Add dramatic_progress_score column (0.0 to 1.0) to store dramatic progression
    - Add filler_ratio column (0.0 to 1.0) to store filler percentage
    - Add build_up_score column (0.0 to 1.0) to store escalation score
    - Add scene_purpose column to store structural purpose
    - Add ai_comment column to store AI's evaluation comment

  2. Purpose
    - Enable storing AI critic's detailed evaluation for each scene
    - Allow PlotChart to display accurate scores from database
    - Ensure all scenes have evaluation data after analysis
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'plot_scenes' AND column_name = 'ai_tension'
  ) THEN
    ALTER TABLE plot_scenes ADD COLUMN ai_tension decimal(3,2) CHECK (ai_tension >= 0 AND ai_tension <= 1);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'plot_scenes' AND column_name = 'ai_pace'
  ) THEN
    ALTER TABLE plot_scenes ADD COLUMN ai_pace decimal(3,2) CHECK (ai_pace >= 0 AND ai_pace <= 1);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'plot_scenes' AND column_name = 'accuracy_score'
  ) THEN
    ALTER TABLE plot_scenes ADD COLUMN accuracy_score decimal(3,2) CHECK (accuracy_score >= 0 AND accuracy_score <= 1);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'plot_scenes' AND column_name = 'causality_score'
  ) THEN
    ALTER TABLE plot_scenes ADD COLUMN causality_score decimal(3,2) CHECK (causality_score >= 0 AND causality_score <= 1);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'plot_scenes' AND column_name = 'dramatic_progress_score'
  ) THEN
    ALTER TABLE plot_scenes ADD COLUMN dramatic_progress_score decimal(3,2) CHECK (dramatic_progress_score >= 0 AND dramatic_progress_score <= 1);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'plot_scenes' AND column_name = 'filler_ratio'
  ) THEN
    ALTER TABLE plot_scenes ADD COLUMN filler_ratio decimal(3,2) CHECK (filler_ratio >= 0 AND filler_ratio <= 1);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'plot_scenes' AND column_name = 'build_up_score'
  ) THEN
    ALTER TABLE plot_scenes ADD COLUMN build_up_score decimal(3,2) CHECK (build_up_score >= 0 AND build_up_score <= 1);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'plot_scenes' AND column_name = 'scene_purpose'
  ) THEN
    ALTER TABLE plot_scenes ADD COLUMN scene_purpose text CHECK (scene_purpose IN ('conflict', 'setup', 'payoff', 'transition'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'plot_scenes' AND column_name = 'ai_comment'
  ) THEN
    ALTER TABLE plot_scenes ADD COLUMN ai_comment text;
  END IF;
END $$;