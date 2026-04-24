/*
  # Update Message Templates for Email Triggers
  
  1. Changes
    - Add trigger_type column to message_templates
    - Update to support HTML content
    - Add bilingual support for both Arabic and English
    
  2. Trigger Types
    - paid_subscription: When user subscribes to a paid plan
    - upgrade_subscription: When user upgrades their plan
    - downgrade_subscription: When user downgrades their plan
    - close_account: When user closes their account
    - book_completed_free: When free user completes a book/story
    
  3. Security
    - Maintain existing RLS policies
*/

DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'email_trigger_type') THEN
    CREATE TYPE email_trigger_type AS ENUM (
      'paid_subscription',
      'upgrade_subscription',
      'downgrade_subscription',
      'close_account',
      'book_completed_free'
    );
  END IF;
END $$;

ALTER TABLE message_templates 
ADD COLUMN IF NOT EXISTS trigger_type email_trigger_type,
ADD COLUMN IF NOT EXISTS html_content_en text,
ADD COLUMN IF NOT EXISTS html_content_ar text;