/*
  # Create Promotional Popups Table

  ## Summary
  Creates a system for admin-controlled promotional popups that appear to writers.

  ## New Tables
  - `promo_popups`
    - `id` (uuid, primary key)
    - `title_ar` (text) - Arabic title
    - `title_en` (text) - English title
    - `body_ar` (text) - Arabic body content
    - `body_en` (text) - English body content
    - `image_url` (text, nullable) - Optional 512x512px image URL
    - `trigger_mode` (text) - 'once' or 'always'
    - `is_active` (boolean) - Whether this popup is currently active
    - `created_at` (timestamptz)
    - `updated_at` (timestamptz)

  ## New Tables for Tracking
  - `promo_popup_views`
    - `id` (uuid, primary key)
    - `popup_id` (uuid, fk promo_popups)
    - `user_id` (uuid, fk auth.users)
    - `viewed_at` (timestamptz)

  ## Security
  - RLS enabled on both tables
  - Admins can manage popups
  - Authenticated users can read active popups
  - Users can only see and insert their own view records
*/

CREATE TABLE IF NOT EXISTS promo_popups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title_ar text NOT NULL DEFAULT '',
  title_en text NOT NULL DEFAULT '',
  body_ar text NOT NULL DEFAULT '',
  body_en text NOT NULL DEFAULT '',
  image_url text,
  trigger_mode text NOT NULL DEFAULT 'once' CHECK (trigger_mode IN ('once', 'always')),
  is_active boolean NOT NULL DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS promo_popup_views (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  popup_id uuid NOT NULL REFERENCES promo_popups(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  viewed_at timestamptz DEFAULT now(),
  UNIQUE(popup_id, user_id)
);

ALTER TABLE promo_popups ENABLE ROW LEVEL SECURITY;
ALTER TABLE promo_popup_views ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage promo popups"
  ON promo_popups FOR SELECT
  TO authenticated
  USING ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

CREATE POLICY "Admins can insert promo popups"
  ON promo_popups FOR INSERT
  TO authenticated
  WITH CHECK ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

CREATE POLICY "Admins can update promo popups"
  ON promo_popups FOR UPDATE
  TO authenticated
  USING ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin')
  WITH CHECK ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

CREATE POLICY "Admins can delete promo popups"
  ON promo_popups FOR DELETE
  TO authenticated
  USING ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

CREATE POLICY "Users can view active promo popups"
  ON promo_popups FOR SELECT
  TO authenticated
  USING (is_active = true);

CREATE POLICY "Users can view own popup views"
  ON promo_popup_views FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own popup views"
  ON promo_popup_views FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all popup views"
  ON promo_popup_views FOR SELECT
  TO authenticated
  USING ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

CREATE INDEX IF NOT EXISTS idx_promo_popups_is_active ON promo_popups(is_active);
CREATE INDEX IF NOT EXISTS idx_promo_popup_views_user_id ON promo_popup_views(user_id);
CREATE INDEX IF NOT EXISTS idx_promo_popup_views_popup_id ON promo_popup_views(popup_id);

CREATE OR REPLACE FUNCTION update_promo_popups_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER promo_popups_updated_at
  BEFORE UPDATE ON promo_popups
  FOR EACH ROW
  EXECUTE FUNCTION update_promo_popups_updated_at();
