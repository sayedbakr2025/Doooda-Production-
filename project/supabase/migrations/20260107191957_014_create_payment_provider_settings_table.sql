/*
  # Create payment provider settings table for Stripe configuration
  
  1. New Tables
    - `payment_provider_settings`
      - `id` (uuid, primary key)
      - `provider_name` (text) - 'stripe', 'paddle', 'paypal'
      - `publishable_key` (text) - Public key (safe to expose)
      - `secret_key_encrypted` (text) - Encrypted secret key
      - `webhook_secret_encrypted` (text) - Encrypted webhook secret
      - `webhook_endpoint` (text) - Webhook URL
      - `is_enabled` (boolean) - Provider active/inactive
      - `is_test_mode` (boolean) - Test vs production mode
      - `last_webhook_at` (timestamp) - Last successful webhook
      - `webhook_failures_count` (integer) - Failed webhooks counter
      - `currency` (text) - Default currency (USD, AED, etc)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)
  
  2. Security
    - Secret keys encrypted at rest
    - Webhook signature verification mandatory
    - No payments if webhook invalid
    - Keys masked in responses
  
  3. Purpose
    - Dynamic payment provider configuration
    - Support multiple providers
    - Test mode for development
    - Webhook monitoring
  
  4. Indexes
    - Index on is_enabled for active provider
    - Index on provider_name for lookup
*/

CREATE TABLE IF NOT EXISTS payment_provider_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_name text NOT NULL CHECK (provider_name IN ('stripe', 'paddle', 'paypal')),
  publishable_key text NOT NULL,
  secret_key_encrypted text NOT NULL,
  webhook_secret_encrypted text NOT NULL,
  webhook_endpoint text NOT NULL,
  is_enabled boolean DEFAULT false,
  is_test_mode boolean DEFAULT true,
  last_webhook_at timestamp with time zone,
  webhook_failures_count integer DEFAULT 0,
  currency text DEFAULT 'USD',
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

CREATE INDEX idx_payment_provider_enabled ON payment_provider_settings(is_enabled);
CREATE INDEX idx_payment_provider_name ON payment_provider_settings(provider_name);
CREATE UNIQUE INDEX idx_payment_one_enabled ON payment_provider_settings(provider_name) WHERE is_enabled = true;

ALTER TABLE payment_provider_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin can manage payment providers"
  ON payment_provider_settings
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()::uuid
      AND users.role = 'admin'
    )
  );
