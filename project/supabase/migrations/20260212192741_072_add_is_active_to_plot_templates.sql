/*
  # Add is_active column and indexes to plot_templates

  1. Changes
    - Add is_active column (boolean, default false)
    - Add indexes on is_active and is_premium for performance
    - Update RLS policies for admin-only write access
    - Regular users can only read active templates

  2. Security
    - Admins can insert, update, delete (soft delete via is_active)
    - Regular users can only select where is_active = true
    - Premium filter applied at application level based on user plan
*/

-- Add is_active column if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'plot_templates' AND column_name = 'is_active'
  ) THEN
    ALTER TABLE plot_templates ADD COLUMN is_active boolean DEFAULT false;
  END IF;
END $$;

-- Set is_active to true for templates that have valid stages JSON
UPDATE plot_templates
SET is_active = true
WHERE stages IS NOT NULL 
  AND jsonb_typeof(stages) = 'array' 
  AND jsonb_array_length(stages) > 0;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_plot_templates_is_active ON plot_templates(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_plot_templates_is_premium ON plot_templates(is_premium);
CREATE INDEX IF NOT EXISTS idx_plot_templates_category ON plot_templates(category);

-- Update RLS policies
DROP POLICY IF EXISTS "Admins can manage plot templates" ON plot_templates;
DROP POLICY IF EXISTS "Users can view active plot templates" ON plot_templates;

-- Admin full access
CREATE POLICY "Admins can manage plot templates"
  ON plot_templates
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

-- Regular users read-only access to active templates
CREATE POLICY "Users can view active plot templates"
  ON plot_templates
  FOR SELECT
  TO authenticated
  USING (is_active = true);