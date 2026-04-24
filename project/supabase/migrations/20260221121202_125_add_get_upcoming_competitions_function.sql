/*
  # Add get_upcoming_competitions function

  ## Problem
  Writers can only see competitions that are currently open (submission_start_at <= now()).
  Competitions marked as "upcoming" (where submission hasn't started yet) are invisible to writers,
  even though it's useful for them to know what's coming.

  ## Changes
  - Add `get_upcoming_competitions()` function that returns competitions where:
    - is_active = true
    - submission_start_at > now() (hasn't started yet)
  - This is a SECURITY DEFINER function so it works safely with RLS

  ## Notes
  - Mirrors the structure of get_open_competitions() for consistency
  - Frontend can call this to show an "Upcoming" tab
*/

CREATE OR REPLACE FUNCTION get_upcoming_competitions()
RETURNS TABLE (
  id uuid,
  title_ar text,
  title_en text,
  organizer_name_ar text,
  organizer_name_en text,
  description_ar text,
  description_en text,
  submission_conditions_ar text,
  submission_conditions_en text,
  submission_start_at timestamptz,
  submission_end_at timestamptz,
  timezone text,
  submission_method text,
  submission_email text,
  submission_link text,
  country_ar text,
  country_en text,
  genre_ar text,
  genre_en text,
  created_at timestamptz,
  first_prize_amount numeric
)
LANGUAGE sql STABLE SECURITY DEFINER
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
    (
      SELECT p.amount
      FROM competition_prizes p
      WHERE p.competition_id = c.id AND p.position = 1
      LIMIT 1
    ) AS first_prize_amount
  FROM competitions c
  WHERE
    c.is_active = true
    AND c.submission_start_at > now()
  ORDER BY c.submission_start_at ASC;
$$;
