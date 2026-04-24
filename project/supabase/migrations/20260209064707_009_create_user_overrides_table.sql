/*
  # Create user overrides table for admin-granted permissions
  
  1. New Tables
    - `user_overrides`
      - `id` (uuid, primary key)
      - `user_id` (uuid, FK to users) - User receiving override
      - `override_type` (text) - 'full_access', 'ai_limit', 'feature_access'
      - `override_value` (jsonb) - Flexible override configuration
      - `reason` (text) - Admin note for why override was granted
      - `granted_by_admin_id` (uuid, FK to users) - Admin who granted
      - `expires_at` (timestamp) - Optional expiry
      - `is_active` (boolean) - Can be toggled
      - `created_at` (timestamp)
      - `updated_at` (timestamp)
  
  2. Purpose
    - Testing: Grant full access to free users
    - Partnerships: Provide custom access
    - Support: Temporary feature access
    - AI limits: Custom AI usage per user
  
  3. Security
    - Override does NOT affect pricing lock
    - All overrides logged in audit_logs
    - Only admins can create/modify
    - Expires automatically if set
  
  4. Indexes
    - Index on user_id for fast lookup
    - Index on override_type for filtering
    - Index on is_active for active checks
*/

CREATE TABLE IF NOT EXISTS user_overrides (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  override_type text NOT NULL CHECK (override_type IN ('full_access', 'ai_limit', 'feature_access', 'custom')),
  override_value jsonb NOT NULL DEFAULT '{}',
  reason text,
  granted_by_admin_id uuid NOT NULL REFERENCES users(id) ON DELETE SET NULL,
  expires_at timestamp with time zone,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

CREATE INDEX idx_user_overrides_user_id ON user_overrides(user_id);
CREATE INDEX idx_user_overrides_type ON user_overrides(override_type);
CREATE INDEX idx_user_overrides_active ON user_overrides(is_active);
CREATE INDEX idx_user_overrides_expires ON user_overrides(expires_at);

ALTER TABLE user_overrides ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin can manage all overrides"
  ON user_overrides
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()::uuid
      AND users.role = 'admin'
    )
  );