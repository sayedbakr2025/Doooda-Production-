/*
  # Institution Works Table

  ## Overview
  Allows institutional accounts (publishers, agencies, etc.) to upload their own works
  and have them evaluated using the same AI evaluation system used for competition submissions.

  ## New Tables

  ### institution_works
  - Stores works uploaded directly by an institution for self-evaluation
  - Fields:
    - id: UUID primary key
    - institution_id: FK to institutional_accounts
    - title: Work title
    - summary: Work text/summary for AI analysis
    - file_url: Optional external file link
    - ai_evaluation: JSONB field storing AI evaluation result (same structure as competition_submissions)
    - ai_evaluated_at: When the AI evaluation was performed
    - notes: Internal notes from the institution
    - created_at: Creation timestamp

  ## Security
  - RLS enabled
  - Institutions can only access their own works
  - Service role used by edge function for writes

  ## Notes
  1. Uses same ai_evaluation JSONB structure as competition_submissions for UI reuse
  2. Evaluation is triggered manually by the institution user
  3. No token cost to the institution (they own the work)
*/

CREATE TABLE IF NOT EXISTS institution_works (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id uuid NOT NULL REFERENCES institutional_accounts(id) ON DELETE CASCADE,
  title text NOT NULL DEFAULT '',
  summary text NOT NULL DEFAULT '',
  file_url text,
  notes text,
  ai_evaluation jsonb,
  ai_evaluated_at timestamptz,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_institution_works_institution ON institution_works(institution_id);
CREATE INDEX IF NOT EXISTS idx_institution_works_created ON institution_works(created_at);

ALTER TABLE institution_works ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Institutions can select own works"
  ON institution_works FOR SELECT
  TO authenticated
  USING (
    institution_id = (
      SELECT id FROM institutional_accounts WHERE id = institution_works.institution_id
      AND auth.uid() IS NOT NULL
    )
  );

CREATE POLICY "Institutions can insert own works"
  ON institution_works FOR INSERT
  TO authenticated
  WITH CHECK (
    institution_id IN (
      SELECT id FROM institutional_accounts
    )
  );

CREATE POLICY "Institutions can update own works"
  ON institution_works FOR UPDATE
  TO authenticated
  USING (
    institution_id IN (
      SELECT id FROM institutional_accounts
    )
  )
  WITH CHECK (
    institution_id IN (
      SELECT id FROM institutional_accounts
    )
  );

CREATE POLICY "Institutions can delete own works"
  ON institution_works FOR DELETE
  TO authenticated
  USING (
    institution_id IN (
      SELECT id FROM institutional_accounts
    )
  );

CREATE POLICY "Admins can manage all institution works"
  ON institution_works FOR SELECT
  TO authenticated
  USING (
    (SELECT (auth.jwt() -> 'app_metadata' ->> 'role')) = 'admin'
  );
