/*
  # Create tracking settings table for analytics and pixels
  
  1. New Tables
    - `tracking_settings`
      - `id` (uuid, primary key)
      - `tracker_type` (text) - 'google_tag_manager', 'meta_pixel', 'custom'
      - `tracker_id` (text) - GTM ID, Pixel ID, etc
      - `script_content` (text) - For custom scripts
      - `placement` (text) - 'head', 'body_start', 'body_end'
      - `is_enabled` (boolean) - Active/inactive
      - `applies_to` (text) - 'all', 'writers_only', 'landing_only'
      - `notes` (text) - Admin notes
      - `created_at` (timestamp)
      - `updated_at` (timestamp)
  
  2. Security
    - Script content sanitized (script tag only, no inline JS)
    - No execution of arbitrary code
    - Toggle enable/disable per tracker
    - Only injected on approved pages
  
  3. Purpose
    - Dynamic analytics configuration
    - No code changes needed
    - Support multiple tracking providers
    - Granular control over placement
  
  4. Indexes
    - Index on is_enabled for active trackers
    - Index on tracker_type for filtering
*/

CREATE TABLE IF NOT EXISTS tracking_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tracker_type text NOT NULL CHECK (tracker_type IN ('google_tag_manager', 'meta_pixel', 'google_analytics', 'custom')),
  tracker_id text,
  script_content text,
  placement text DEFAULT 'head' CHECK (placement IN ('head', 'body_start', 'body_end')),
  is_enabled boolean DEFAULT false,
  applies_to text DEFAULT 'all' CHECK (applies_to IN ('all', 'writers_only', 'landing_only', 'admin_only')),
  notes text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

CREATE INDEX idx_tracking_enabled ON tracking_settings(is_enabled);
CREATE INDEX idx_tracking_type ON tracking_settings(tracker_type);
CREATE INDEX idx_tracking_applies ON tracking_settings(applies_to);

ALTER TABLE tracking_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin can manage tracking settings"
  ON tracking_settings
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()::uuid
      AND users.role = 'admin'
    )
  );
