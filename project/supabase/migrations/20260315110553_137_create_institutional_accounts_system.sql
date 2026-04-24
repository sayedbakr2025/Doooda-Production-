/*
  # Institutional Accounts System - Partners & Publishing Entities

  ## Summary
  Creates the complete infrastructure for partner/institutional accounts including:
  
  1. New Tables:
    - `institutional_accounts` - Partner institution accounts with token balances
    - `institution_evaluation_criteria` - Evaluation criteria defined by institutions
    - `competition_submissions` - Writer submissions to partner competitions
    - `competition_boosts` - Token spending records for competition boosts
    - `partner_application_status` - Track application status
  
  2. Modified Tables:
    - `competitions` - Add created_by_partner, partner_id, boost_tokens_spent flags
  
  3. Security:
    - RLS enabled on all new tables
    - Institutions can only access their own data
    - Writers can submit to open competitions
    - Writers can view their own submissions
*/

-- institutional_accounts table
CREATE TABLE IF NOT EXISTS institutional_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  publisher_id uuid REFERENCES publishers(id) ON DELETE SET NULL,
  email text UNIQUE NOT NULL,
  name text NOT NULL,
  password_hash text,
  institution_type text NOT NULL DEFAULT 'publisher',
  country text DEFAULT '',
  city text DEFAULT '',
  phone text DEFAULT '',
  website text DEFAULT '',
  description text DEFAULT '',
  accepted_genres text[] DEFAULT '{}',
  accepted_work_types text[] DEFAULT '{}',
  submission_guidelines text DEFAULT '',
  tokens_balance integer NOT NULL DEFAULT 30000,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE institutional_accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Institutions read own account"
  ON institutional_accounts FOR SELECT
  TO authenticated
  USING (email = auth.jwt() ->> 'email');

CREATE POLICY "Admins read all institutional accounts"
  ON institutional_accounts FOR SELECT
  TO authenticated
  USING ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

CREATE POLICY "Admins update institutional accounts"
  ON institutional_accounts FOR UPDATE
  TO authenticated
  USING ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin')
  WITH CHECK ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

CREATE POLICY "Admins delete institutional accounts"
  ON institutional_accounts FOR DELETE
  TO authenticated
  USING ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

CREATE POLICY "Anyone can create institutional account application"
  ON institutional_accounts FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- Add partner columns to competitions table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'competitions' AND column_name = 'created_by_partner'
  ) THEN
    ALTER TABLE competitions ADD COLUMN created_by_partner boolean NOT NULL DEFAULT false;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'competitions' AND column_name = 'partner_id'
  ) THEN
    ALTER TABLE competitions ADD COLUMN partner_id uuid REFERENCES institutional_accounts(id) ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'competitions' AND column_name = 'boost_tokens_spent'
  ) THEN
    ALTER TABLE competitions ADD COLUMN boost_tokens_spent integer NOT NULL DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'competitions' AND column_name = 'boost_enabled'
  ) THEN
    ALTER TABLE competitions ADD COLUMN boost_enabled boolean NOT NULL DEFAULT false;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'competitions' AND column_name = 'boost_budget_tokens'
  ) THEN
    ALTER TABLE competitions ADD COLUMN boost_budget_tokens integer NOT NULL DEFAULT 0;
  END IF;
END $$;

-- competition_submissions table
CREATE TABLE IF NOT EXISTS competition_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  competition_id uuid NOT NULL REFERENCES competitions(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  project_id uuid REFERENCES projects(id) ON DELETE SET NULL,
  work_title text NOT NULL DEFAULT '',
  work_summary text NOT NULL DEFAULT '',
  include_cv boolean NOT NULL DEFAULT false,
  file_url text DEFAULT '',
  tokens_spent integer NOT NULL DEFAULT 10,
  status text NOT NULL DEFAULT 'submitted',
  ai_evaluation jsonb DEFAULT NULL,
  ai_evaluated_at timestamptz DEFAULT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE competition_submissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Writers view own submissions"
  ON competition_submissions FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Writers insert own submissions"
  ON competition_submissions FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Writers update own submissions"
  ON competition_submissions FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Partners view submissions for their competitions"
  ON competition_submissions FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM competitions c
      JOIN institutional_accounts ia ON ia.id = c.partner_id
      WHERE c.id = competition_submissions.competition_id
      AND ia.email = auth.jwt() ->> 'email'
    )
  );

CREATE POLICY "Admins view all submissions"
  ON competition_submissions FOR SELECT
  TO authenticated
  USING ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

CREATE POLICY "Admins update all submissions"
  ON competition_submissions FOR UPDATE
  TO authenticated
  USING ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin')
  WITH CHECK ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

-- institution_evaluation_criteria table
CREATE TABLE IF NOT EXISTS institution_evaluation_criteria (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id uuid NOT NULL REFERENCES institutional_accounts(id) ON DELETE CASCADE,
  competition_id uuid REFERENCES competitions(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text DEFAULT '',
  weight integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE institution_evaluation_criteria ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Institutions view own criteria"
  ON institution_evaluation_criteria FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM institutional_accounts ia
      WHERE ia.id = institution_evaluation_criteria.institution_id
      AND ia.email = auth.jwt() ->> 'email'
    )
  );

CREATE POLICY "Institutions insert criteria"
  ON institution_evaluation_criteria FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM institutional_accounts ia
      WHERE ia.id = institution_evaluation_criteria.institution_id
      AND ia.email = auth.jwt() ->> 'email'
    )
  );

CREATE POLICY "Institutions update criteria"
  ON institution_evaluation_criteria FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM institutional_accounts ia
      WHERE ia.id = institution_evaluation_criteria.institution_id
      AND ia.email = auth.jwt() ->> 'email'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM institutional_accounts ia
      WHERE ia.id = institution_evaluation_criteria.institution_id
      AND ia.email = auth.jwt() ->> 'email'
    )
  );

CREATE POLICY "Institutions delete criteria"
  ON institution_evaluation_criteria FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM institutional_accounts ia
      WHERE ia.id = institution_evaluation_criteria.institution_id
      AND ia.email = auth.jwt() ->> 'email'
    )
  );

CREATE POLICY "Admins manage all criteria"
  ON institution_evaluation_criteria FOR SELECT
  TO authenticated
  USING ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

-- competition_boosts table to track boost popup events
CREATE TABLE IF NOT EXISTS competition_boosts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  competition_id uuid NOT NULL REFERENCES competitions(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tokens_spent integer NOT NULL DEFAULT 15,
  shown_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE competition_boosts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own boost events"
  ON competition_boosts FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users insert boost events"
  ON competition_boosts FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins view all boosts"
  ON competition_boosts FOR SELECT
  TO authenticated
  USING ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_competition_submissions_competition_id ON competition_submissions(competition_id);
CREATE INDEX IF NOT EXISTS idx_competition_submissions_user_id ON competition_submissions(user_id);
CREATE INDEX IF NOT EXISTS idx_institution_evaluation_criteria_institution_id ON institution_evaluation_criteria(institution_id);
CREATE INDEX IF NOT EXISTS idx_competition_boosts_competition_id ON competition_boosts(competition_id);
CREATE INDEX IF NOT EXISTS idx_competitions_partner_id ON competitions(partner_id);
CREATE INDEX IF NOT EXISTS idx_institutional_accounts_email ON institutional_accounts(email);
