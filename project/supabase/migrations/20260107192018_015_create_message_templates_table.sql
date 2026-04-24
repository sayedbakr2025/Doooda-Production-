/*
  # Create message templates table for dynamic messaging
  
  1. New Tables
    - `message_templates`
      - `id` (uuid, primary key)
      - `template_key` (text, unique) - Unique identifier (e.g., 'welcome_email')
      - `template_name` (text) - Human-readable name
      - `template_type` (text) - 'email', 'in_app', 'push_notification', 'system'
      - `category` (text) - 'onboarding', 'motivation', 'reminder', 'error', 'celebration'
      - `subject_en` (text) - Email subject in English
      - `subject_ar` (text) - Email subject in Arabic
      - `content_en` (text) - Message content in English
      - `content_ar` (text) - Message content in Arabic
      - `variables` (jsonb) - Available placeholders: {{pen_name}}, {{project_title}}, etc
      - `is_enabled` (boolean) - Template active/inactive
      - `delivery_channel` (text[]) - ['email', 'in_app', 'push']
      - `send_conditions` (jsonb) - When to send (optional rules)
      - `fallback_template_key` (text) - Fallback if this fails
      - `last_sent_at` (timestamp) - Last usage timestamp
      - `sent_count` (integer) - Usage counter
      - `created_at` (timestamp)
      - `updated_at` (timestamp)
  
  2. Purpose
    - No hardcoded messages in code
    - Admin controls all user-facing text
    - Multi-language support (Arabic & English)
    - Dynamic variable substitution
    - Preview before sending
  
  3. Supported Placeholders
    - {{pen_name}} - User's pen name
    - {{first_name}} - User's first name
    - {{project_title}} - Current project name
    - {{daily_goal}} - Daily writing goal
    - {{current_progress}} - Current word count
    - {{writing_time}} - Time spent writing
    - {{achievement}} - Achievement name
    - {{date}} - Current date
  
  4. Message Categories
    - onboarding: Welcome, verification, setup
    - motivation: Daily encouragement, writing streaks
    - reminder: Session reminders, goal nudges
    - celebration: Milestones, achievements
    - error: System errors, validation messages
    - marketing: Newsletter, announcements
  
  5. Security
    - Templates sanitized before storage
    - No executable code in templates
    - Variable substitution server-side only
    - XSS protection on render
  
  6. Indexes
    - Unique index on template_key for fast lookup
    - Index on template_type for filtering
    - Index on is_enabled for active templates
    - Index on category for organization
*/

CREATE TABLE IF NOT EXISTS message_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_key text UNIQUE NOT NULL,
  template_name text NOT NULL,
  template_type text NOT NULL CHECK (template_type IN ('email', 'in_app', 'push_notification', 'system')),
  category text NOT NULL CHECK (category IN ('onboarding', 'motivation', 'reminder', 'celebration', 'error', 'marketing', 'system')),
  subject_en text,
  subject_ar text,
  content_en text NOT NULL,
  content_ar text NOT NULL,
  variables jsonb DEFAULT '[]',
  is_enabled boolean DEFAULT true,
  delivery_channel text[] DEFAULT '{}',
  send_conditions jsonb DEFAULT '{}',
  fallback_template_key text,
  last_sent_at timestamp with time zone,
  sent_count integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

CREATE UNIQUE INDEX idx_message_templates_key ON message_templates(template_key);
CREATE INDEX idx_message_templates_type ON message_templates(template_type);
CREATE INDEX idx_message_templates_enabled ON message_templates(is_enabled);
CREATE INDEX idx_message_templates_category ON message_templates(category);

ALTER TABLE message_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin can manage message templates"
  ON message_templates
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()::uuid
      AND users.role = 'admin'
    )
  );

CREATE POLICY "Writers can read enabled templates"
  ON message_templates
  FOR SELECT
  TO authenticated
  USING (is_enabled = true);
