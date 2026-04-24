/*
  # Add writer_tension and writer_pace to plot_scenes

  ## Summary
  Adds two new columns to plot_scenes to store the writer's expected tension and pace
  values that are already sent to the AI for analysis but were never persisted.

  ## Changes
  - `plot_scenes`: Added `writer_tension` (decimal 0-1) and `writer_pace` (decimal 0-1)
    These are derived from tension_level/10 and pace_level/10 respectively,
    stored after analysis so the chart can display writer vs AI comparison.
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'plot_scenes' AND column_name = 'writer_tension'
  ) THEN
    ALTER TABLE plot_scenes ADD COLUMN writer_tension decimal(3,2);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'plot_scenes' AND column_name = 'writer_pace'
  ) THEN
    ALTER TABLE plot_scenes ADD COLUMN writer_pace decimal(3,2);
  END IF;
END $$;
