/*
  # Create Competitions (Literary Contests) System

  ## Summary
  Creates the full database schema for literary competitions/contests.

  ## New Tables

  ### competitions
  Stores literary competition listings including bilingual content, submission window,
  submission method, and auto-calculated status.

  Columns:
  - id: UUID primary key
  - title_ar / title_en: Bilingual competition title
  - organizer_name_ar / organizer_name_en: Bilingual organizer name
  - description_ar / description_en: Full bilingual description
  - submission_conditions_ar / submission_conditions_en: Bilingual eligibility/conditions text
  - submission_start_at: When submissions open (timestamptz)
  - submission_end_at: When submissions close (timestamptz)
  - timezone: IANA timezone string (e.g. "Africa/Cairo", "Europe/London")
  - submission_method: enum (email | external_link)
  - submission_email: nullable, used when method = email
  - submission_link: nullable, used when method = external_link
  - is_active: controls visibility to writers
  - status: computed enum (upcoming | open | expired) — auto-updated by trigger + function
  - created_at / updated_at

  ### competition_prizes
  Stores prize tiers for each competition (unlimited prizes per competition).

  Columns:
  - id: UUID primary key
  - competition_id: FK to competitions (cascade delete)
  - position: integer rank (1 = first place, 2 = second, etc.)
  - title_ar / title_en: Bilingual prize title
  - reward_description_ar / reward_description_en: Bilingual reward detail
  - amount: optional monetary amount
  - currency: optional currency code (e.g. "USD", "EGP")

  ## Automatic Status Logic
  - A DB function `compute_competition_status` derives status from now() vs submission window
  - A trigger `trg_competitions_set_status` fires on INSERT and UPDATE to set status automatically
  - A scheduled-style function `refresh_competition_statuses` can be called by a cron job or
    edge function to keep statuses current without user interaction

  ## Security
  - RLS enabled on both tables
  - Writers (authenticated) can SELECT active competitions
  - Admins (role = admin via JWT) can INSERT, UPDATE, DELETE
*/

-- ─── Enums ────────────────────────────────────────────────────────────────────

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'competition_submission_method') THEN
    CREATE TYPE competition_submission_method AS ENUM ('email', 'external_link');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'competition_status') THEN
    CREATE TYPE competition_status AS ENUM ('upcoming', 'open', 'expired');
  END IF;
END $$;

-- ─── competitions ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS competitions (
  id                          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title_ar                    text NOT NULL DEFAULT '',
  title_en                    text NOT NULL DEFAULT '',
  organizer_name_ar           text NOT NULL DEFAULT '',
  organizer_name_en           text NOT NULL DEFAULT '',
  description_ar              text NOT NULL DEFAULT '',
  description_en              text NOT NULL DEFAULT '',
  submission_conditions_ar    text NOT NULL DEFAULT '',
  submission_conditions_en    text NOT NULL DEFAULT '',
  submission_start_at         timestamptz NOT NULL,
  submission_end_at           timestamptz NOT NULL,
  timezone                    text NOT NULL DEFAULT 'UTC',
  submission_method           competition_submission_method NOT NULL DEFAULT 'external_link',
  submission_email            text,
  submission_link             text,
  is_active                   boolean NOT NULL DEFAULT true,
  status                      competition_status NOT NULL DEFAULT 'upcoming',
  created_at                  timestamptz NOT NULL DEFAULT now(),
  updated_at                  timestamptz NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_competitions_submission_start_at ON competitions (submission_start_at);
CREATE INDEX IF NOT EXISTS idx_competitions_submission_end_at   ON competitions (submission_end_at);
CREATE INDEX IF NOT EXISTS idx_competitions_status              ON competitions (status);
CREATE INDEX IF NOT EXISTS idx_competitions_is_active           ON competitions (is_active);

-- ─── competition_prizes ───────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS competition_prizes (
  id                        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  competition_id            uuid NOT NULL REFERENCES competitions(id) ON DELETE CASCADE,
  position                  integer NOT NULL CHECK (position > 0),
  title_ar                  text NOT NULL DEFAULT '',
  title_en                  text NOT NULL DEFAULT '',
  reward_description_ar     text NOT NULL DEFAULT '',
  reward_description_en     text NOT NULL DEFAULT '',
  amount                    numeric(12, 2),
  currency                  text,
  created_at                timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_competition_prizes_competition_id ON competition_prizes (competition_id);

-- ─── Automatic Status Function ────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION compute_competition_status(
  p_start timestamptz,
  p_end   timestamptz
)
RETURNS competition_status
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE
    WHEN now() < p_start THEN 'upcoming'::competition_status
    WHEN now() BETWEEN p_start AND p_end THEN 'open'::competition_status
    ELSE 'expired'::competition_status
  END;
$$;

-- ─── Trigger: auto-set status on INSERT / UPDATE ──────────────────────────────

CREATE OR REPLACE FUNCTION trg_fn_competitions_set_status()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.status    := compute_competition_status(NEW.submission_start_at, NEW.submission_end_at);
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_competitions_set_status ON competitions;
CREATE TRIGGER trg_competitions_set_status
  BEFORE INSERT OR UPDATE ON competitions
  FOR EACH ROW
  EXECUTE FUNCTION trg_fn_competitions_set_status();

-- ─── Bulk-refresh helper (for cron / edge function) ──────────────────────────

CREATE OR REPLACE FUNCTION refresh_competition_statuses()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE competitions
  SET
    status     = compute_competition_status(submission_start_at, submission_end_at),
    updated_at = now()
  WHERE status <> compute_competition_status(submission_start_at, submission_end_at);
END;
$$;

-- ─── RLS ──────────────────────────────────────────────────────────────────────

ALTER TABLE competitions       ENABLE ROW LEVEL SECURITY;
ALTER TABLE competition_prizes ENABLE ROW LEVEL SECURITY;

-- competitions: authenticated writers can read active competitions
CREATE POLICY "Authenticated users can view active competitions"
  ON competitions FOR SELECT
  TO authenticated
  USING (is_active = true);

-- competitions: admin full access
CREATE POLICY "Admins can insert competitions"
  ON competitions FOR INSERT
  TO authenticated
  WITH CHECK ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

CREATE POLICY "Admins can update competitions"
  ON competitions FOR UPDATE
  TO authenticated
  USING  ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin')
  WITH CHECK ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

CREATE POLICY "Admins can delete competitions"
  ON competitions FOR DELETE
  TO authenticated
  USING ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

-- competition_prizes: authenticated writers can read prizes for active competitions
CREATE POLICY "Authenticated users can view prizes of active competitions"
  ON competition_prizes FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM competitions c
      WHERE c.id = competition_prizes.competition_id
        AND c.is_active = true
    )
  );

CREATE POLICY "Admins can insert competition prizes"
  ON competition_prizes FOR INSERT
  TO authenticated
  WITH CHECK ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

CREATE POLICY "Admins can update competition prizes"
  ON competition_prizes FOR UPDATE
  TO authenticated
  USING  ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin')
  WITH CHECK ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

CREATE POLICY "Admins can delete competition prizes"
  ON competition_prizes FOR DELETE
  TO authenticated
  USING ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');
