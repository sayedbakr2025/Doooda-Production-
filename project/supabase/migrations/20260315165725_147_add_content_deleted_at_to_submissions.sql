/*
  # Add content_deleted_at to competition_submissions and institution_works

  ## Overview
  After an AI evaluation is completed, the raw work content (work_summary text and file)
  is no longer needed and should be deleted to save storage. This migration adds a
  tracking column so the system can record when content was purged post-evaluation.

  ## Changes

  ### competition_submissions
  - Add `content_deleted_at` (timestamptz, nullable): timestamp when work_summary was cleared after evaluation

  ### institution_works
  - Add `content_deleted_at` (timestamptz, nullable): timestamp when summary was cleared after evaluation

  ## Notes
  1. NULL means content has not been deleted yet
  2. A non-null value means the AI evaluation is complete and the raw content has been purged
  3. This is intentional by design: institutions receive the full evaluation report, raw text is discarded
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'competition_submissions' AND column_name = 'content_deleted_at'
  ) THEN
    ALTER TABLE competition_submissions ADD COLUMN content_deleted_at timestamptz;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'institution_works' AND column_name = 'content_deleted_at'
  ) THEN
    ALTER TABLE institution_works ADD COLUMN content_deleted_at timestamptz;
  END IF;
END $$;
