/*
  # Remove Unused Indexes

  ## Summary
  Removes database indexes that have not been utilized. These indexes were created
  proactively for performance optimization but remain unused due to current low data
  volume and query patterns.

  ## Indexes Being Removed

  ### Authentication & User Management
  - `idx_users_role` - User role lookups
  - `idx_users_created_at` - User creation date queries
  - `idx_auth_sessions_user_id` - Session user lookups
  - `idx_auth_sessions_expires_at` - Session expiry checks
  - `idx_auth_sessions_refresh_token_hash` - Token validation
  - `idx_email_verification_tokens_user_id` - Verification by user
  - `idx_email_verification_tokens_token_hash` - Token lookups
  - `idx_email_verification_tokens_expires_at` - Token expiry
  - `idx_password_reset_tokens_user_id` - Reset by user
  - `idx_password_reset_tokens_token_hash` - Token lookups
  - `idx_password_reset_tokens_expires_at` - Token expiry

  ### Admin Configuration
  - `idx_smtp_settings_active` - Active SMTP config
  - `idx_ai_providers_enabled` - Enabled AI providers
  - `idx_ai_providers_default` - Default provider lookups
  - `idx_publishers_country` - Publishers by country
  - `idx_publishers_active` - Active publishers
  - `idx_publishers_sort` - Publisher sorting
  - `idx_publishers_country_active` - Combined country/active filter
  - `idx_tracking_enabled` - Enabled tracking
  - `idx_tracking_type` - Tracking by type
  - `idx_tracking_applies` - Tracking applicability
  - `idx_payment_provider_enabled` - Enabled payment providers
  - `idx_payment_provider_name` - Provider by name
  - `idx_message_templates_type` - Templates by type
  - `idx_message_templates_enabled` - Enabled templates
  - `idx_message_templates_category` - Templates by category

  ### AI Usage & Limits
  - `idx_ai_limits_user_id` - Limits by user
  - `idx_ai_limits_type` - Limits by type
  - `idx_ai_limits_active` - Active limits
  - `idx_ai_limits_plan` - Limits by plan
  - `idx_ai_limits_set_by_admin_id` - Limits set by admin
  - `idx_ai_tracking_user_id` - Tracking by user
  - `idx_ai_tracking_timestamp` - Tracking by time
  - `idx_ai_tracking_user_date` - Combined user/date tracking
  - `idx_ai_tracking_status` - Tracking by status

  ### Subscription & Billing
  - `idx_subscriptions_user_id` - Subscriptions by user
  - `idx_subscriptions_status` - Subscriptions by status
  - `idx_subscriptions_stripe_id` - Stripe ID lookups
  - `idx_subscriptions_user_id_status` - Combined user/status
  - `idx_subscriptions_price_version_id` - Subscriptions by price
  - `idx_subscription_history_user_id` - History by user
  - `idx_subscription_history_occurred_at` - History by date
  - `idx_subscription_history_event_type` - History by event type
  - `idx_subscription_history_price_version_id` - History by price
  - `idx_subscription_history_subscription_id` - History by subscription
  - `idx_price_versions_plan_name` - Prices by plan
  - `idx_price_versions_active` - Active prices

  ### User Overrides & Audit
  - `idx_user_overrides_user_id` - Overrides by user
  - `idx_user_overrides_type` - Overrides by type
  - `idx_user_overrides_active` - Active overrides
  - `idx_user_overrides_expires` - Override expiry
  - `idx_user_overrides_granted_by_admin_id` - Overrides by granting admin
  - `idx_audit_logs_user_id` - Audit by user
  - `idx_audit_logs_occurred_at` - Audit by date
  - `idx_audit_logs_action` - Audit by action
  - `idx_audit_logs_admin_id` - Audit by admin

  ### Writing Projects
  - `idx_projects_user_id` - Projects by user
  - `idx_projects_updated_at` - Projects by update date
  - `idx_chapters_project_id` - Chapters by project
  - `idx_chapters_project_position` - Chapter ordering
  - `idx_scenes_chapter_id` - Scenes by chapter
  - `idx_scenes_chapter_position` - Scene ordering
  - `idx_tasks_user_project` - Tasks by user/project
  - `idx_tasks_project_created` - Tasks by creation
  - `idx_tasks_completed` - Completed tasks
  - `idx_sessions_user_date` - Writing sessions by user/date
  - `idx_sessions_project_date` - Writing sessions by project/date
  - `idx_characters_user_project` - Characters by user/project
  - `idx_characters_project_name` - Characters by name

  ## Notes
  - These indexes can be recreated if performance metrics indicate they're needed
  - Index usage will be monitored as the application scales
  - Critical indexes for RLS policies are retained
*/

-- Authentication & User Management
DROP INDEX IF EXISTS idx_users_role;
DROP INDEX IF EXISTS idx_users_created_at;
DROP INDEX IF EXISTS idx_auth_sessions_user_id;
DROP INDEX IF EXISTS idx_auth_sessions_expires_at;
DROP INDEX IF EXISTS idx_auth_sessions_refresh_token_hash;
DROP INDEX IF EXISTS idx_email_verification_tokens_user_id;
DROP INDEX IF EXISTS idx_email_verification_tokens_token_hash;
DROP INDEX IF EXISTS idx_email_verification_tokens_expires_at;
DROP INDEX IF EXISTS idx_password_reset_tokens_user_id;
DROP INDEX IF EXISTS idx_password_reset_tokens_token_hash;
DROP INDEX IF EXISTS idx_password_reset_tokens_expires_at;

-- Admin Configuration
DROP INDEX IF EXISTS idx_smtp_settings_active;
DROP INDEX IF EXISTS idx_ai_providers_enabled;
DROP INDEX IF EXISTS idx_ai_providers_default;
DROP INDEX IF EXISTS idx_publishers_country;
DROP INDEX IF EXISTS idx_publishers_active;
DROP INDEX IF EXISTS idx_publishers_sort;
DROP INDEX IF EXISTS idx_publishers_country_active;
DROP INDEX IF EXISTS idx_tracking_enabled;
DROP INDEX IF EXISTS idx_tracking_type;
DROP INDEX IF EXISTS idx_tracking_applies;
DROP INDEX IF EXISTS idx_payment_provider_enabled;
DROP INDEX IF EXISTS idx_payment_provider_name;
DROP INDEX IF EXISTS idx_message_templates_type;
DROP INDEX IF EXISTS idx_message_templates_enabled;
DROP INDEX IF EXISTS idx_message_templates_category;

-- AI Usage & Limits
DROP INDEX IF EXISTS idx_ai_limits_user_id;
DROP INDEX IF EXISTS idx_ai_limits_type;
DROP INDEX IF EXISTS idx_ai_limits_active;
DROP INDEX IF EXISTS idx_ai_limits_plan;
DROP INDEX IF EXISTS idx_ai_usage_limits_set_by_admin_id;
DROP INDEX IF EXISTS idx_ai_tracking_user_id;
DROP INDEX IF EXISTS idx_ai_tracking_timestamp;
DROP INDEX IF EXISTS idx_ai_tracking_user_date;
DROP INDEX IF EXISTS idx_ai_tracking_status;

-- Subscription & Billing
DROP INDEX IF EXISTS idx_subscriptions_user_id;
DROP INDEX IF EXISTS idx_subscriptions_status;
DROP INDEX IF EXISTS idx_subscriptions_stripe_id;
DROP INDEX IF EXISTS idx_subscriptions_user_id_status;
DROP INDEX IF EXISTS idx_subscriptions_price_version_id;
DROP INDEX IF EXISTS idx_subscription_history_user_id;
DROP INDEX IF EXISTS idx_subscription_history_occurred_at;
DROP INDEX IF EXISTS idx_subscription_history_event_type;
DROP INDEX IF EXISTS idx_subscription_history_price_version_id;
DROP INDEX IF EXISTS idx_subscription_history_subscription_id;
DROP INDEX IF EXISTS idx_price_versions_plan_name;
DROP INDEX IF EXISTS idx_price_versions_active;

-- User Overrides & Audit
DROP INDEX IF EXISTS idx_user_overrides_user_id;
DROP INDEX IF EXISTS idx_user_overrides_type;
DROP INDEX IF EXISTS idx_user_overrides_active;
DROP INDEX IF EXISTS idx_user_overrides_expires;
DROP INDEX IF EXISTS idx_user_overrides_granted_by_admin_id;
DROP INDEX IF EXISTS idx_audit_logs_user_id;
DROP INDEX IF EXISTS idx_audit_logs_occurred_at;
DROP INDEX IF EXISTS idx_audit_logs_action;
DROP INDEX IF EXISTS idx_audit_logs_admin_id;

-- Writing Projects
DROP INDEX IF EXISTS idx_projects_user_id;
DROP INDEX IF EXISTS idx_projects_updated_at;
DROP INDEX IF EXISTS idx_chapters_project_id;
DROP INDEX IF EXISTS idx_chapters_project_position;
DROP INDEX IF EXISTS idx_scenes_chapter_id;
DROP INDEX IF EXISTS idx_scenes_chapter_position;
DROP INDEX IF EXISTS idx_tasks_user_project;
DROP INDEX IF EXISTS idx_tasks_project_created;
DROP INDEX IF EXISTS idx_tasks_completed;
DROP INDEX IF EXISTS idx_sessions_user_date;
DROP INDEX IF EXISTS idx_sessions_project_date;
DROP INDEX IF EXISTS idx_characters_user_project;
DROP INDEX IF EXISTS idx_characters_project_name;
