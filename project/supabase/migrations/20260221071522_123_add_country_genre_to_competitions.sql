/*
  # Add country, genre fields to competitions + server-side expiry RPC

  ## Changes

  ### Modified Tables
  - `competitions`
    - `country_ar` (text): Country name in Arabic
    - `country_en` (text): Country name in English
    - `genre_ar` (text): Literary genre in Arabic
    - `genre_en` (text): Literary genre in English

  ## New Functions
  - `get_open_competitions`: Returns only competitions where status=open AND is_active=true,
    with server-side evaluation of submission_end_at > now(). This is the authoritative
    backend check — no dependency on browser time or client-side refresh logic.
    Also returns is_ending_soon (< 3 days) and is_new (created within last 7 days) as
    computed columns so the frontend never has to calculate these.

  ## Notes
  - Uses timestamptz arithmetic on server (no browser clock)
  - is_ending_soon and is_new are pure SQL — deterministic at query time
  - Indexes added for country_en and genre_en for filter performance
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'competitions' AND column_name = 'country_ar'
  ) THEN
    ALTER TABLE competitions ADD COLUMN country_ar text NOT NULL DEFAULT '';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'competitions' AND column_name = 'country_en'
  ) THEN
    ALTER TABLE competitions ADD COLUMN country_en text NOT NULL DEFAULT '';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'competitions' AND column_name = 'genre_ar'
  ) THEN
    ALTER TABLE competitions ADD COLUMN genre_ar text NOT NULL DEFAULT '';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'competitions' AND column_name = 'genre_en'
  ) THEN
    ALTER TABLE competitions ADD COLUMN genre_en text NOT NULL DEFAULT '';
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_competitions_country_en ON competitions (country_en);
CREATE INDEX IF NOT EXISTS idx_competitions_genre_en   ON competitions (genre_en);

-- ─── Server-side open competitions with computed badges ──────────────────────
-- Returns competitions that are truly open right now (server clock),
-- plus is_ending_soon and is_new computed at query time.

CREATE OR REPLACE FUNCTION get_open_competitions()
RETURNS TABLE (
  id                          uuid,
  title_ar                    text,
  title_en                    text,
  organizer_name_ar           text,
  organizer_name_en           text,
  description_ar              text,
  description_en              text,
  submission_conditions_ar    text,
  submission_conditions_en    text,
  submission_start_at         timestamptz,
  submission_end_at           timestamptz,
  timezone                    text,
  submission_method           competition_submission_method,
  submission_email            text,
  submission_link             text,
  country_ar                  text,
  country_en                  text,
  genre_ar                    text,
  genre_en                    text,
  created_at                  timestamptz,
  is_ending_soon              boolean,
  is_new                      boolean,
  first_prize_amount          numeric
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    c.id,
    c.title_ar,
    c.title_en,
    c.organizer_name_ar,
    c.organizer_name_en,
    c.description_ar,
    c.description_en,
    c.submission_conditions_ar,
    c.submission_conditions_en,
    c.submission_start_at,
    c.submission_end_at,
    c.timezone,
    c.submission_method,
    c.submission_email,
    c.submission_link,
    c.country_ar,
    c.country_en,
    c.genre_ar,
    c.genre_en,
    c.created_at,
    (c.submission_end_at - now()) < interval '3 days'  AS is_ending_soon,
    (now() - c.created_at)        < interval '7 days'  AS is_new,
    (
      SELECT p.amount
      FROM competition_prizes p
      WHERE p.competition_id = c.id AND p.position = 1
      LIMIT 1
    ) AS first_prize_amount
  FROM competitions c
  WHERE
    c.is_active = true
    AND c.submission_start_at <= now()
    AND c.submission_end_at   >  now()
  ORDER BY c.submission_end_at ASC;
$$;

GRANT EXECUTE ON FUNCTION get_open_competitions() TO authenticated;
