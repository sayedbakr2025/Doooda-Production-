/*
  # Create Users Table
  
  1. New Tables
    - `users`
      - `id` (uuid, primary key) - Synced with auth.users
      - `email` (text, unique) - User email
      - `password_hash` (text) - Legacy field (auth handles passwords)
      - `role` (text) - User role: 'writer' or 'admin'
      - `email_verified` (boolean) - Email verification status
      - `first_name` (text) - User first name
      - `last_name` (text) - User last name
      - `pen_name` (text) - Writer pen name
      - `locale` (text) - User language preference
      - `gender` (text) - User gender
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
  
  2. Security
    - Enable RLS on users table
    - Users can read their own data
    - Users can update their own data
    - Admins can read all data
*/

CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY,
  email text UNIQUE NOT NULL,
  password_hash text DEFAULT '',
  role text DEFAULT 'writer' CHECK (role IN ('writer', 'admin')),
  email_verified boolean DEFAULT false,
  first_name text DEFAULT '',
  last_name text DEFAULT '',
  pen_name text DEFAULT '',
  locale text DEFAULT 'en',
  gender text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);

ALTER TABLE users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own data"
  ON users FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can update own data"
  ON users FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Admins can read all data"
  ON users FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid()
      AND u.role = 'admin'
    )
  );