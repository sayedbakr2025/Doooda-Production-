/*
  # Add Missing Character Fields

  1. Changes
    - Add `height` (text, nullable) - character's height
    - Add `weight` (text, nullable) - character's weight
    - Add `psychological_issue_cause` (text, nullable) - cause of the psychological issue
    - Add `relationship_with_surrounding_people` (text, nullable) - general relationships
    - Add `influential_life_events` (text, nullable) - events that shaped the character
    - Add `distinctive_features` (text, nullable) - physical or behavioral distinctive features

  2. Security
    - No changes to RLS policies

  3. Important Notes
    - All new fields are optional
    - Fields support long text descriptions
    - Existing characters will have NULL values for new fields
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'characters' AND column_name = 'height'
  ) THEN
    ALTER TABLE characters ADD COLUMN height text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'characters' AND column_name = 'weight'
  ) THEN
    ALTER TABLE characters ADD COLUMN weight text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'characters' AND column_name = 'psychological_issue_cause'
  ) THEN
    ALTER TABLE characters ADD COLUMN psychological_issue_cause text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'characters' AND column_name = 'relationship_with_surrounding_people'
  ) THEN
    ALTER TABLE characters ADD COLUMN relationship_with_surrounding_people text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'characters' AND column_name = 'influential_life_events'
  ) THEN
    ALTER TABLE characters ADD COLUMN influential_life_events text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'characters' AND column_name = 'distinctive_features'
  ) THEN
    ALTER TABLE characters ADD COLUMN distinctive_features text;
  END IF;
END $$;

COMMENT ON COLUMN characters.height IS 'Character height';
COMMENT ON COLUMN characters.weight IS 'Character weight';
COMMENT ON COLUMN characters.psychological_issue_cause IS 'Cause of the psychological issue';
COMMENT ON COLUMN characters.relationship_with_surrounding_people IS 'General relationships with surrounding people';
COMMENT ON COLUMN characters.influential_life_events IS 'Influential life events that shaped the character';
COMMENT ON COLUMN characters.distinctive_features IS 'Physical or behavioral distinctive features';
