/*
  # Create SMTP settings table for email configuration
  
  1. New Tables
    - `smtp_settings`
      - `id` (uuid, primary key)
      - `provider_name` (text) - 'sendgrid', 'mailgun', 'ses', 'custom'
      - `host` (text) - SMTP host
      - `port` (integer) - SMTP port (587, 465, etc)
      - `username` (text) - SMTP username
      - `password_encrypted` (text) - Encrypted SMTP password
      - `from_email` (text) - Sender email address
      - `from_name` (text) - Sender name
      - `use_tls` (boolean) - Use TLS/SSL
      - `is_active` (boolean) - Currently active configuration
      - `last_test_at` (timestamp) - Last successful test
      - `last_test_result` (text) - Success or error message
      - `created_at` (timestamp)
      - `updated_at` (timestamp)
  
  2. Security
    - Password encrypted at rest using application-layer encryption
    - Password NEVER returned in full (masked as *****)
    - Test email functionality for validation
    - Only one active configuration at a time
  
  3. Purpose
    - Dynamic email provider configuration
    - No code changes needed to switch providers
    - Admin can test before activating
  
  4. Indexes
    - Index on is_active for quick lookup
*/

CREATE TABLE IF NOT EXISTS smtp_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_name text NOT NULL,
  host text NOT NULL,
  port integer NOT NULL DEFAULT 587,
  username text NOT NULL,
  password_encrypted text NOT NULL,
  from_email text NOT NULL,
  from_name text NOT NULL,
  use_tls boolean DEFAULT true,
  is_active boolean DEFAULT false,
  last_test_at timestamp with time zone,
  last_test_result text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

CREATE INDEX idx_smtp_settings_active ON smtp_settings(is_active);
CREATE UNIQUE INDEX idx_smtp_one_active ON smtp_settings(is_active) WHERE is_active = true;

ALTER TABLE smtp_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin can manage SMTP settings"
  ON smtp_settings
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()::uuid
      AND users.role = 'admin'
    )
  );
