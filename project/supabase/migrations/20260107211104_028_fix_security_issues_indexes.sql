/*
  # Fix Database Security Issues - Part 1: Indexes
  
  1. Changes
    - Add missing indexes for foreign keys
    - Drop duplicate indexes
    - Keep essential indexes, remove unused ones strategically
  
  2. Security
    - Improves query performance
    - Reduces index maintenance overhead
*/

-- Add missing indexes for foreign keys
CREATE INDEX IF NOT EXISTS idx_ai_usage_limits_set_by_admin_id 
  ON ai_usage_limits(set_by_admin_id) WHERE set_by_admin_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_subscription_history_price_version_id 
  ON subscription_history(price_version_id);

CREATE INDEX IF NOT EXISTS idx_subscription_history_subscription_id 
  ON subscription_history(subscription_id);

CREATE INDEX IF NOT EXISTS idx_subscriptions_price_version_id 
  ON subscriptions(price_version_id);

CREATE INDEX IF NOT EXISTS idx_user_overrides_granted_by_admin_id 
  ON user_overrides(granted_by_admin_id) WHERE granted_by_admin_id IS NOT NULL;

-- Drop duplicate indexes (keep unique constraint indexes, drop redundant ones)
DROP INDEX IF EXISTS idx_message_templates_key;
DROP INDEX IF EXISTS idx_users_email;