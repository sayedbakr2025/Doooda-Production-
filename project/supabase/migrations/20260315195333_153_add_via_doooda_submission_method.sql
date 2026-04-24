/*
  # Add 'via_doooda' as a competition submission method

  ## Summary
  Adds a new enum value 'via_doooda' to the competition_submission_method type.
  When selected, writers can submit their work directly through Doooda's
  marketing panel without needing an external link or email.

  ## Changes
  - Adds 'via_doooda' to the competition_submission_method enum
*/

ALTER TYPE competition_submission_method ADD VALUE IF NOT EXISTS 'via_doooda';
