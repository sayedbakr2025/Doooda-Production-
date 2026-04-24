/*
  # Add Project Limit Enforcement

  1. New Function
    - `check_project_limit()` - Trigger function to enforce project limits
    - FREE users: 3 projects maximum
    - PRO users: Unlimited projects
    - Checks user's subscription plan from app_metadata

  2. Trigger
    - Fires BEFORE INSERT on projects table
    - Prevents creation if limit exceeded
    - Returns clear error message

  3. Security
    - Server-side enforcement only
    - Cannot be bypassed by frontend
    - Applies to all authenticated users
*/

-- Function to check project limits based on user plan
CREATE OR REPLACE FUNCTION check_project_limit()
RETURNS TRIGGER AS $$
DECLARE
  user_project_count INTEGER;
  user_plan TEXT;
  max_projects INTEGER;
BEGIN
  -- Get user's current project count (non-deleted)
  SELECT COUNT(*)
  INTO user_project_count
  FROM projects
  WHERE user_id = NEW.user_id
    AND deleted_at IS NULL;

  -- Get user's subscription plan from app_metadata
  -- Default to FREE if not set
  SELECT COALESCE(
    (auth.jwt() -> 'app_metadata' ->> 'subscription_plan'),
    'FREE'
  )
  INTO user_plan;

  -- Set max projects based on plan
  IF user_plan = 'PRO' OR user_plan = 'STANDARD' THEN
    -- PRO and STANDARD users have unlimited projects
    max_projects := NULL;
  ELSE
    -- FREE users limited to 3 projects
    max_projects := 3;
  END IF;

  -- Check if limit exceeded (only if limit exists)
  IF max_projects IS NOT NULL AND user_project_count >= max_projects THEN
    RAISE EXCEPTION 'project limit exceeded: You have reached the maximum of % projects for your % plan. Please upgrade or delete unused projects.', max_projects, user_plan;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to enforce project limits
DROP TRIGGER IF EXISTS enforce_project_limit ON projects;
CREATE TRIGGER enforce_project_limit
  BEFORE INSERT ON projects
  FOR EACH ROW
  EXECUTE FUNCTION check_project_limit();
