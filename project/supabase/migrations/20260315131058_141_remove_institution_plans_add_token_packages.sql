/*
  # Remove Institution Plans System & Add Token Packages

  ## Overview
  This migration removes the tiered plan system (bronze/silver/gold) for institutional accounts
  and replaces it with a simple token-based model:
  - All institutional accounts receive 100,000 welcome tokens on approval (admin-set)
  - No plans, no subscriptions, no recurring billing
  - Any account can purchase token packages at any time
  - Token packages expire after 1 year from purchase date

  ## Changes

  ### institutional_accounts table
  - Remove `plan` column (no longer needed)
  - Remove `plan_renewed_at` column (no longer needed)

  ### institution_token_packages table (NEW)
  - Tracks token package purchases per institution
  - Each package has its own expiration date (1 year from purchase)
  - Tokens are cumulative with the main balance

  ### institution_token_package_catalog table (NEW)
  - Defines available token packages for purchase
  - Admin-manageable catalog of packages with prices

  ## Security
  - RLS enabled on both new tables
  - Institutions can only view/insert their own package purchases
  - Admins can manage all
*/

-- Remove plan columns from institutional_accounts (safe: no business logic depends on them going forward)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'institutional_accounts' AND column_name = 'plan'
  ) THEN
    ALTER TABLE public.institutional_accounts DROP COLUMN plan;
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'institutional_accounts' AND column_name = 'plan_renewed_at'
  ) THEN
    ALTER TABLE public.institutional_accounts DROP COLUMN plan_renewed_at;
  END IF;
END $$;

-- Create token package catalog (admin-managed)
CREATE TABLE IF NOT EXISTS public.institution_token_package_catalog (
  id serial PRIMARY KEY,
  tokens integer NOT NULL,
  price_usd numeric(10,2) NOT NULL,
  label_ar text NOT NULL DEFAULT '',
  label_en text NOT NULL DEFAULT '',
  is_popular boolean NOT NULL DEFAULT false,
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.institution_token_package_catalog ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active token package catalog"
  ON public.institution_token_package_catalog
  FOR SELECT
  TO anon, authenticated
  USING (is_active = true);

CREATE POLICY "Admins can manage token package catalog"
  ON public.institution_token_package_catalog
  FOR ALL
  TO authenticated
  USING ((SELECT (auth.jwt()->'app_metadata'->>'role')) = 'admin')
  WITH CHECK ((SELECT (auth.jwt()->'app_metadata'->>'role')) = 'admin');

-- Seed default packages
INSERT INTO public.institution_token_package_catalog (tokens, price_usd, label_ar, label_en, is_popular, sort_order)
VALUES
  (2000000,  30.00, '2,000,000 توكن', '2,000,000 tokens', false, 1),
  (5000000,  55.00, '5,000,000 توكن', '5,000,000 tokens', true,  2),
  (10000000, 99.00, '10,000,000 توكن', '10,000,000 tokens', false, 3)
ON CONFLICT DO NOTHING;

-- Create institution token purchases table
CREATE TABLE IF NOT EXISTS public.institution_token_purchases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id uuid NOT NULL REFERENCES public.institutional_accounts(id) ON DELETE CASCADE,
  catalog_id integer REFERENCES public.institution_token_package_catalog(id),
  tokens integer NOT NULL,
  price_usd numeric(10,2) NOT NULL,
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '1 year'),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'expired')),
  notes text DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.institution_token_purchases ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_institution_token_purchases_institution_id
  ON public.institution_token_purchases (institution_id);

CREATE INDEX IF NOT EXISTS idx_institution_token_purchases_status
  ON public.institution_token_purchases (status);

CREATE INDEX IF NOT EXISTS idx_institution_token_purchases_expires_at
  ON public.institution_token_purchases (expires_at);

CREATE POLICY "Institutions can view own purchases"
  ON public.institution_token_purchases
  FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Institutions can insert own purchase requests"
  ON public.institution_token_purchases
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Admins can update purchase status"
  ON public.institution_token_purchases
  FOR UPDATE
  TO authenticated
  USING ((SELECT (auth.jwt()->'app_metadata'->>'role')) = 'admin')
  WITH CHECK ((SELECT (auth.jwt()->'app_metadata'->>'role')) = 'admin');
