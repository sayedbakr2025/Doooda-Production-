/*
  # Add status column to projects table

  ## Summary
  Adds a `status` field to the `projects` table so writers can explicitly mark
  a project as completed (or archived), independent of word count goals.

  ## Changes
  - New column `status` on `projects`:
    - Type: text with CHECK constraint
    - Allowed values: 'active', 'completed', 'archived'
    - Default: 'active'
  - All existing projects are migrated to 'active' status
  - No data is deleted or modified beyond setting the default

  ## Notes
  - The `completedProjects` counter in the dashboard will now count rows
    where `status = 'completed'` instead of `progress_percentage >= 100`
  - RLS policies are unchanged; writers can update only their own projects
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'projects' AND column_name = 'status'
  ) THEN
    ALTER TABLE projects
      ADD COLUMN status text NOT NULL DEFAULT 'active'
      CHECK (status IN ('active', 'completed', 'archived'));
  END IF;
END $$;
