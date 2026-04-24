/*
  # Update Projects RLS for Supabase Auth
  
  1. Changes
    - Drop old policies that depend on custom users table
    - Create new policies that work with Supabase auth.users
    - Allow authenticated users to create and manage their own projects
  
  2. Security
    - Users can only see and modify their own projects
    - Uses auth.uid() instead of checking custom users table
*/

-- Drop existing policies
DROP POLICY IF EXISTS "Writers can view own projects" ON projects;
DROP POLICY IF EXISTS "Writers can create projects" ON projects;
DROP POLICY IF EXISTS "Writers can update own projects" ON projects;
DROP POLICY IF EXISTS "Writers can soft-delete own projects" ON projects;
DROP POLICY IF EXISTS "Admins can view all projects" ON projects;

-- Create new policies for Supabase Auth
CREATE POLICY "Users can view own projects"
  ON projects FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id AND deleted_at IS NULL);

CREATE POLICY "Users can create own projects"
  ON projects FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own projects"
  ON projects FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id AND deleted_at IS NULL)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can soft-delete own projects"
  ON projects FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);