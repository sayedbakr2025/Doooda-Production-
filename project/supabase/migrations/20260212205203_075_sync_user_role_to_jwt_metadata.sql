/*
  # Sync User Role to JWT Metadata

  This migration ensures that the user's role is stored in auth.users.raw_app_meta_data
  so it can be accessed via auth.jwt()->>'role' in RLS policies.

  ## Changes
  - Create function to sync role to metadata
  - Create trigger to sync on INSERT/UPDATE
  - Update all existing users to have role in metadata
*/

-- ============================================================================
-- 1. CREATE FUNCTION TO SYNC ROLE TO JWT METADATA
-- ============================================================================

CREATE OR REPLACE FUNCTION sync_user_role_to_metadata()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Update the auth.users table with the role in raw_app_meta_data
  UPDATE auth.users
  SET raw_app_meta_data = COALESCE(raw_app_meta_data, '{}'::jsonb) || jsonb_build_object('role', NEW.role)
  WHERE id = NEW.id;
  
  RETURN NEW;
END;
$$;

-- ============================================================================
-- 2. CREATE TRIGGER TO AUTO-SYNC ROLE
-- ============================================================================

DROP TRIGGER IF EXISTS sync_user_role_trigger ON users;

CREATE TRIGGER sync_user_role_trigger
  AFTER INSERT OR UPDATE OF role ON users
  FOR EACH ROW
  EXECUTE FUNCTION sync_user_role_to_metadata();

-- ============================================================================
-- 3. UPDATE ALL EXISTING USERS TO HAVE ROLE IN METADATA
-- ============================================================================

DO $$
DECLARE
  user_record RECORD;
BEGIN
  FOR user_record IN SELECT id, role FROM users
  LOOP
    UPDATE auth.users
    SET raw_app_meta_data = COALESCE(raw_app_meta_data, '{}'::jsonb) || jsonb_build_object('role', user_record.role)
    WHERE id = user_record.id;
  END LOOP;
END $$;