/*
  # Extend Institutional Accounts for Admin Management

  ## Overview
  This migration adds admin management capabilities to the institutional accounts system.

  ## Changes

  ### institutional_accounts table
  - Add `status` column: 'pending' | 'approved' | 'suspended' | 'rejected'
  - Add `rejection_reason` column for rejected applications
  - Add `total_tokens_spent` column for tracking usage
  - Migrate existing is_active=true accounts to status='approved'
  - Migrate existing is_active=false accounts to status='pending'

  ### institution_token_logs table (NEW)
  - Tracks every admin token modification (add/remove/reset)
  - Ensures full auditability of token changes

  ### competitions table
  - Add `status` column: 'pending' | 'approved' | 'rejected' for partner competitions
  - Existing admin competitions default to 'approved'

  ## Security
  - RLS enabled on new tables
  - Only admins can manage statuses and token logs
*/

-- Add status column to institutional_accounts
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'institutional_accounts' AND column_name = 'status'
  ) THEN
    ALTER TABLE public.institutional_accounts
      ADD COLUMN status text NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending', 'approved', 'suspended', 'rejected'));
  END IF;
END $$;

-- Add rejection_reason column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'institutional_accounts' AND column_name = 'rejection_reason'
  ) THEN
    ALTER TABLE public.institutional_accounts ADD COLUMN rejection_reason text DEFAULT '';
  END IF;
END $$;

-- Add total_tokens_spent column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'institutional_accounts' AND column_name = 'total_tokens_spent'
  ) THEN
    ALTER TABLE public.institutional_accounts ADD COLUMN total_tokens_spent integer NOT NULL DEFAULT 0;
  END IF;
END $$;

-- Migrate existing records: is_active=true → status='approved', is_active=false → status='pending'
UPDATE public.institutional_accounts
SET status = 'approved'
WHERE is_active = true AND status = 'pending';

-- Add competition status for partner competitions approval workflow
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'competitions' AND column_name = 'approval_status'
  ) THEN
    ALTER TABLE public.competitions
      ADD COLUMN approval_status text NOT NULL DEFAULT 'approved'
        CHECK (approval_status IN ('pending', 'approved', 'rejected'));
  END IF;
END $$;

-- Existing partner competitions default to pending for review
UPDATE public.competitions
SET approval_status = 'pending'
WHERE created_by_partner = true AND approval_status = 'approved';

-- Create token audit log table
CREATE TABLE IF NOT EXISTS public.institution_token_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id uuid NOT NULL REFERENCES public.institutional_accounts(id) ON DELETE CASCADE,
  admin_id uuid REFERENCES auth.users(id),
  action text NOT NULL CHECK (action IN ('add', 'remove', 'reset')),
  amount integer NOT NULL,
  balance_before integer NOT NULL,
  balance_after integer NOT NULL,
  note text DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.institution_token_logs ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_institution_token_logs_institution_id
  ON public.institution_token_logs (institution_id);

CREATE POLICY "Admins can manage token logs"
  ON public.institution_token_logs
  FOR ALL
  TO authenticated
  USING ((SELECT (auth.jwt()->'app_metadata'->>'role')) = 'admin')
  WITH CHECK ((SELECT (auth.jwt()->'app_metadata'->>'role')) = 'admin');

-- Add RLS policies for admin to manage institutional_accounts status/tokens
CREATE POLICY "Admins can update institutional accounts"
  ON public.institutional_accounts
  FOR UPDATE
  TO authenticated
  USING ((SELECT (auth.jwt()->'app_metadata'->>'role')) = 'admin')
  WITH CHECK ((SELECT (auth.jwt()->'app_metadata'->>'role')) = 'admin');

CREATE POLICY "Admins can delete institutional accounts"
  ON public.institutional_accounts
  FOR DELETE
  TO authenticated
  USING ((SELECT (auth.jwt()->'app_metadata'->>'role')) = 'admin');

-- Allow admins to read all institutional accounts
CREATE POLICY "Admins can read all institutional accounts"
  ON public.institutional_accounts
  FOR SELECT
  TO authenticated
  USING ((SELECT (auth.jwt()->'app_metadata'->>'role')) = 'admin');

-- Allow admins to update competition approval status
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'competitions'
    AND policyname = 'Admins can update competition approval status'
  ) THEN
    EXECUTE $policy$
      CREATE POLICY "Admins can update competition approval status"
        ON public.competitions
        FOR UPDATE
        TO authenticated
        USING ((SELECT (auth.jwt()->'app_metadata'->>'role')) = 'admin')
        WITH CHECK ((SELECT (auth.jwt()->'app_metadata'->>'role')) = 'admin');
    $policy$;
  END IF;
END $$;

-- Allow admins to read all competition submissions
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'competition_submissions'
    AND policyname = 'Admins can read all submissions'
  ) THEN
    EXECUTE $policy$
      CREATE POLICY "Admins can read all submissions"
        ON public.competition_submissions
        FOR SELECT
        TO authenticated
        USING ((SELECT (auth.jwt()->'app_metadata'->>'role')) = 'admin');
    $policy$;
  END IF;
END $$;

-- Allow admins to update competition submissions (flag/remove)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'competition_submissions'
    AND policyname = 'Admins can update submissions'
  ) THEN
    EXECUTE $policy$
      CREATE POLICY "Admins can update submissions"
        ON public.competition_submissions
        FOR UPDATE
        TO authenticated
        USING ((SELECT (auth.jwt()->'app_metadata'->>'role')) = 'admin')
        WITH CHECK ((SELECT (auth.jwt()->'app_metadata'->>'role')) = 'admin');
    $policy$;
  END IF;
END $$;

-- Allow admins to delete competition submissions
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'competition_submissions'
    AND policyname = 'Admins can delete submissions'
  ) THEN
    EXECUTE $policy$
      CREATE POLICY "Admins can delete submissions"
        ON public.competition_submissions
        FOR DELETE
        TO authenticated
        USING ((SELECT (auth.jwt()->'app_metadata'->>'role')) = 'admin');
    $policy$;
  END IF;
END $$;

-- Helper function: get institution stats
CREATE OR REPLACE FUNCTION public.get_institution_stats(p_institution_id uuid)
RETURNS TABLE (
  competitions_count bigint,
  submissions_count bigint,
  total_tokens_purchased bigint
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    (SELECT COUNT(*) FROM competitions WHERE partner_id = p_institution_id) AS competitions_count,
    (
      SELECT COUNT(*)
      FROM competition_submissions cs
      JOIN competitions c ON c.id = cs.competition_id
      WHERE c.partner_id = p_institution_id
    ) AS submissions_count,
    COALESCE(
      (SELECT SUM(tokens) FROM institution_token_purchases WHERE institution_id = p_institution_id AND status = 'confirmed'),
      0
    ) AS total_tokens_purchased;
$$;
