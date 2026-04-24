/*
  # Update Users Table - Add Gender Preference

  1. Changes to users table
    - Add `gender` (text) - for gender-aware celebration messages in Arabic
      Values: 'male', 'female', 'prefer_not_to_say'
      Default: 'prefer_not_to_say'

  2. Important Notes
    - Used for celebration message customization in Arabic
    - Arabic has grammatical gender (different verb endings)
    - Default is gender-neutral option
    - User can update anytime from settings

  3. Examples
    - Male: "لقد حققت الهدف" (reached goal - masculine)
    - Female: "لقد حققتِ الهدف" (reached goal - feminine)
    - Prefer not to say: Use neutral/male form by default
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'gender'
  ) THEN
    ALTER TABLE users ADD COLUMN gender text DEFAULT 'prefer_not_to_say' CHECK (gender IN ('male', 'female', 'prefer_not_to_say'));
  END IF;
END $$;

COMMENT ON COLUMN users.gender IS 'Gender preference for grammatically correct Arabic messages';
