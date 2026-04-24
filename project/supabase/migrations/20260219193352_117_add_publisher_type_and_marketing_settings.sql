/*
  # Marketing System - Publishers & Settings

  1. Changes to publishers table
    - Add `publisher_type` column: 'publisher' | 'production_company'
    - Add `genre_primary` column for primary genre classification
    - Add `accepts_manuscripts_direct` boolean for direct submission flag
    - Add `country_en` column for English country name

  2. Marketing Settings
    - No new table needed; marketing is plan-gated via users.plan column

  3. Notes
    - publishers table already exists from migration 012
    - We safely add columns only if they don't exist
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'publishers' AND column_name = 'publisher_type'
  ) THEN
    ALTER TABLE publishers ADD COLUMN publisher_type text DEFAULT 'publisher' CHECK (publisher_type IN ('publisher', 'production_company'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'publishers' AND column_name = 'genre_primary'
  ) THEN
    ALTER TABLE publishers ADD COLUMN genre_primary text DEFAULT '';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'publishers' AND column_name = 'accepts_manuscripts_direct'
  ) THEN
    ALTER TABLE publishers ADD COLUMN accepts_manuscripts_direct boolean DEFAULT true;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'publishers' AND column_name = 'country_en'
  ) THEN
    ALTER TABLE publishers ADD COLUMN country_en text DEFAULT '';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'publishers' AND column_name = 'name_en'
  ) THEN
    ALTER TABLE publishers ADD COLUMN name_en text DEFAULT '';
  END IF;
END $$;
