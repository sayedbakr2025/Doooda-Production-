/*
  # Add file_name column to institution_works

  Adds a file_name column to store the original uploaded file name,
  separate from the file_url (signed storage URL).
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'institution_works' AND column_name = 'file_name'
  ) THEN
    ALTER TABLE institution_works ADD COLUMN file_name text;
  END IF;
END $$;
