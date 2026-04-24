/*
  # Sync Supabase Auth Users to Public Users Table

  ## Problem
  - Application uses Supabase Auth (auth.users) for authentication
  - Projects table has foreign key to public.users
  - No automatic sync between auth.users and public.users
  - Project creation fails with foreign key constraint error

  ## Solution
  1. Create trigger function to sync auth.users to public.users
  2. Automatically create public.users record on auth signup
  3. Sync user metadata (first_name, last_name, pen_name, locale)
  4. Handle existing auth.users by backfilling public.users

  ## Changes
  - Function: `handle_new_user()` - Creates public.users from auth.users
  - Trigger: Fires on INSERT to auth.users
  - Backfill: Sync existing auth.users to public.users

  ## Security
  - Function runs with SECURITY DEFINER to bypass RLS
  - Only creates records, never modifies or deletes
  - Preserves auth.users.id as public.users.id for FK integrity
*/

-- Function to handle new user creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Insert into public.users table
  INSERT INTO public.users (
    id,
    email,
    password_hash,
    role,
    email_verified,
    first_name,
    last_name,
    pen_name,
    locale,
    created_at,
    updated_at
  )
  VALUES (
    NEW.id,
    NEW.email,
    '', -- Empty password hash since auth handles passwords
    'writer', -- Default role
    NEW.email_confirmed_at IS NOT NULL,
    COALESCE(NEW.raw_user_meta_data->>'first_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'last_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'pen_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'preferred_language', 'en'),
    NEW.created_at,
    NEW.updated_at
  )
  ON CONFLICT (id) DO NOTHING;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Create trigger on auth.users
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Backfill existing auth.users to public.users
INSERT INTO public.users (
  id,
  email,
  password_hash,
  role,
  email_verified,
  first_name,
  last_name,
  pen_name,
  locale,
  created_at,
  updated_at
)
SELECT
  id,
  email,
  '',
  'writer',
  email_confirmed_at IS NOT NULL,
  COALESCE(raw_user_meta_data->>'first_name', ''),
  COALESCE(raw_user_meta_data->>'last_name', ''),
  COALESCE(raw_user_meta_data->>'pen_name', ''),
  COALESCE(raw_user_meta_data->>'preferred_language', 'en'),
  created_at,
  updated_at
FROM auth.users
WHERE deleted_at IS NULL
ON CONFLICT (id) DO NOTHING;
