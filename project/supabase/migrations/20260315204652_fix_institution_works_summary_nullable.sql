/*
  # Fix institution_works summary column to allow NULL

  The summary column was incorrectly set as NOT NULL.
  Works uploaded without a summary should be allowed.
*/

ALTER TABLE institution_works ALTER COLUMN summary DROP NOT NULL;
