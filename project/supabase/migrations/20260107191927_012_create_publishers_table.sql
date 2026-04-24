/*
  # Create publishers table for marketing/publisher management
  
  1. New Tables
    - `publishers`
      - `id` (uuid, primary key)
      - `name` (text) - Publisher name
      - `country` (text) - ISO country code or name
      - `submission_email` (text) - Email for manuscript submissions
      - `website` (text) - Optional publisher website
      - `genres` (text[]) - Accepted genres
      - `accepts_new_writers` (boolean) - Accepting submissions
      - `submission_guidelines_url` (text) - Link to guidelines
      - `notes` (text) - Admin notes
      - `is_active` (boolean) - Visible to writers
      - `sort_order` (integer) - Display order
      - `created_at` (timestamp)
      - `updated_at` (timestamp)
  
  2. Purpose
    - Writers can browse publishers by country
    - Admin controls publisher database
    - Writers cannot edit, only read
  
  3. Business Rules
    - Sorted by country on frontend
    - Only active publishers shown to writers
    - Admin can archive without deletion
  
  4. Indexes
    - Index on country for filtering
    - Index on is_active for writer queries
    - Index on sort_order for display
*/

CREATE TABLE IF NOT EXISTS publishers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  country text NOT NULL,
  submission_email text NOT NULL,
  website text,
  genres text[] DEFAULT '{}',
  accepts_new_writers boolean DEFAULT true,
  submission_guidelines_url text,
  notes text,
  is_active boolean DEFAULT true,
  sort_order integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

CREATE INDEX idx_publishers_country ON publishers(country);
CREATE INDEX idx_publishers_active ON publishers(is_active);
CREATE INDEX idx_publishers_sort ON publishers(sort_order);
CREATE INDEX idx_publishers_country_active ON publishers(country, is_active);

ALTER TABLE publishers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin can manage publishers"
  ON publishers
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()::uuid
      AND users.role = 'admin'
    )
  );

CREATE POLICY "Writers can read active publishers"
  ON publishers
  FOR SELECT
  TO authenticated
  USING (is_active = true);
