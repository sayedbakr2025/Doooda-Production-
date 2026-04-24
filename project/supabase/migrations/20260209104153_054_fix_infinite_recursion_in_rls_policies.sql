/*
  # Fix Infinite Recursion in RLS Policies

  1. Problem
    - All admin policies query the users table to check role
    - This creates infinite recursion when users table tries to check its own policies
    - Error: "infinite recursion detected in policy for relation 'users'"

  2. Solution
    - Create helper function `is_admin()` that uses app_metadata from JWT
    - Update all policies to use this function instead of querying users table
    - Store admin role in auth.users.raw_app_meta_data during user creation

  3. Changes
    - Drop all existing recursive policies
    - Create `is_admin()` function using auth.jwt()
    - Recreate policies using the new function
    - Add trigger to sync role to app_metadata

  4. Security
    - app_metadata cannot be modified by users
    - Only service_role can update app_metadata
    - RLS policies remain restrictive
*/

-- Drop all existing admin policies that cause recursion
DROP POLICY IF EXISTS "Admins can read all data" ON users;
DROP POLICY IF EXISTS "Admins can view all projects" ON projects;
DROP POLICY IF EXISTS "Admins can view all chapters" ON chapters;
DROP POLICY IF EXISTS "Admins can view all scenes" ON scenes;
DROP POLICY IF EXISTS "Admins can view all loglines" ON loglines;

-- Create helper function to check admin role from JWT
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN COALESCE(
    (auth.jwt() -> 'app_metadata' ->> 'role')::text = 'admin',
    false
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Recreate admin policies using the new function
CREATE POLICY "Admins can read all user data"
  ON users FOR SELECT
  TO authenticated
  USING (is_admin());

CREATE POLICY "Admins can view all projects"
  ON projects FOR SELECT
  TO authenticated
  USING (is_admin());

CREATE POLICY "Admins can view all chapters"
  ON chapters FOR SELECT
  TO authenticated
  USING (is_admin());

CREATE POLICY "Admins can view all scenes"
  ON scenes FOR SELECT
  TO authenticated
  USING (is_admin());

CREATE POLICY "Admins can view all loglines"
  ON loglines FOR SELECT
  TO authenticated
  USING (is_admin());

-- Create trigger to sync role to app_metadata when user role changes
CREATE OR REPLACE FUNCTION sync_user_role_to_metadata()
RETURNS TRIGGER AS $$
BEGIN
  -- Update auth.users app_metadata when role changes in public.users
  UPDATE auth.users
  SET raw_app_meta_data = 
    COALESCE(raw_app_meta_data, '{}'::jsonb) || 
    jsonb_build_object('role', NEW.role)
  WHERE id = NEW.id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS sync_role_to_metadata_trigger ON users;
CREATE TRIGGER sync_role_to_metadata_trigger
  AFTER INSERT OR UPDATE OF role ON users
  FOR EACH ROW
  EXECUTE FUNCTION sync_user_role_to_metadata();

-- Sync existing admin users
UPDATE auth.users au
SET raw_app_meta_data = 
  COALESCE(raw_app_meta_data, '{}'::jsonb) || 
  jsonb_build_object('role', u.role)
FROM users u
WHERE au.id = u.id AND u.role = 'admin';
