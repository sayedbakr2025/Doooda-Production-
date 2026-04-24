/*
  # Admin Role Setup and Admin User Creation

  1. New Functions
    - `public.is_admin()` - Returns true if current auth user has admin role
    - Used in RLS policies to gate admin-only table access

  2. Admin User
    - Creates a dedicated admin user in auth.users
    - Email: admin@doooda.com
    - Password: Doooda@Admin2024
    - Sets role = 'admin' in public.users

  3. Security
    - `is_admin()` queries public.users.role server-side
    - No hardcoded emails in frontend; role is database-driven
    - Admin role stored in public.users, enforced via RLS
    - Function uses SECURITY DEFINER with explicit search_path

  4. Notes
    - The handle_new_user trigger auto-creates public.users with role='writer'
    - Migration then promotes the record to role='admin'
    - Password can be reset via Supabase standard password reset flow
*/

-- Helper function: check if current auth user is admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.users
    WHERE id = auth.uid()
      AND role = 'admin'
      AND deleted_at IS NULL
  );
$$;

-- Create admin user in auth.users
DO $$
DECLARE
  admin_id uuid;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM auth.users WHERE email = 'admin@doooda.com'
  ) THEN
    admin_id := gen_random_uuid();

    INSERT INTO auth.users (
      instance_id,
      id,
      aud,
      role,
      email,
      encrypted_password,
      email_confirmed_at,
      created_at,
      updated_at,
      raw_app_meta_data,
      raw_user_meta_data,
      is_super_admin,
      is_sso_user,
      is_anonymous
    ) VALUES (
      '00000000-0000-0000-0000-000000000000',
      admin_id,
      'authenticated',
      'authenticated',
      'admin@doooda.com',
      crypt('Doooda@Admin2024', gen_salt('bf')),
      now(),
      now(),
      now(),
      '{"provider":"email","providers":["email"],"app_role":"admin"}',
      '{"role":"admin"}',
      false,
      false,
      false
    );

    -- Insert identity record so Supabase auth login works
    INSERT INTO auth.identities (
      id,
      user_id,
      identity_data,
      provider,
      provider_id,
      last_sign_in_at,
      created_at,
      updated_at
    ) VALUES (
      admin_id,
      admin_id,
      jsonb_build_object('sub', admin_id::text, 'email', 'admin@doooda.com'),
      'email',
      admin_id::text,
      now(),
      now(),
      now()
    );

    -- The handle_new_user trigger creates public.users with role='writer'
    -- Now promote to admin
    UPDATE public.users
    SET role = 'admin'
    WHERE id = admin_id;
  END IF;
END $$;

-- Ensure app_metadata includes admin role for JWT
UPDATE auth.users
SET raw_app_meta_data = raw_app_meta_data || '{"app_role":"admin"}'
WHERE email = 'admin@doooda.com';

-- RLS policies for admin-only tables using is_admin()

-- ai_providers: admin only
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'Admins can view ai_providers' AND tablename = 'ai_providers'
  ) THEN
    CREATE POLICY "Admins can view ai_providers"
      ON public.ai_providers FOR SELECT
      TO authenticated
      USING (public.is_admin());
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'Admins can modify ai_providers' AND tablename = 'ai_providers'
  ) THEN
    CREATE POLICY "Admins can modify ai_providers"
      ON public.ai_providers FOR UPDATE
      TO authenticated
      USING (public.is_admin())
      WITH CHECK (public.is_admin());
  END IF;
END $$;

-- smtp_settings: admin only
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'Admins can view smtp_settings' AND tablename = 'smtp_settings'
  ) THEN
    CREATE POLICY "Admins can view smtp_settings"
      ON public.smtp_settings FOR SELECT
      TO authenticated
      USING (public.is_admin());
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'Admins can modify smtp_settings' AND tablename = 'smtp_settings'
  ) THEN
    CREATE POLICY "Admins can modify smtp_settings"
      ON public.smtp_settings FOR UPDATE
      TO authenticated
      USING (public.is_admin())
      WITH CHECK (public.is_admin());
  END IF;
END $$;

-- tracking_settings: admin only
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'Admins can view tracking_settings' AND tablename = 'tracking_settings'
  ) THEN
    CREATE POLICY "Admins can view tracking_settings"
      ON public.tracking_settings FOR SELECT
      TO authenticated
      USING (public.is_admin());
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'Admins can modify tracking_settings' AND tablename = 'tracking_settings'
  ) THEN
    CREATE POLICY "Admins can modify tracking_settings"
      ON public.tracking_settings FOR UPDATE
      TO authenticated
      USING (public.is_admin())
      WITH CHECK (public.is_admin());
  END IF;
END $$;

-- payment_provider_settings: admin only
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'Admins can view payment_provider_settings' AND tablename = 'payment_provider_settings'
  ) THEN
    CREATE POLICY "Admins can view payment_provider_settings"
      ON public.payment_provider_settings FOR SELECT
      TO authenticated
      USING (public.is_admin());
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'Admins can modify payment_provider_settings' AND tablename = 'payment_provider_settings'
  ) THEN
    CREATE POLICY "Admins can modify payment_provider_settings"
      ON public.payment_provider_settings FOR UPDATE
      TO authenticated
      USING (public.is_admin())
      WITH CHECK (public.is_admin());
  END IF;
END $$;

-- publishers: admin write, readers can view active ones
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'Admins can insert publishers' AND tablename = 'publishers'
  ) THEN
    CREATE POLICY "Admins can insert publishers"
      ON public.publishers FOR INSERT
      TO authenticated
      WITH CHECK (public.is_admin());
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'Admins can update publishers' AND tablename = 'publishers'
  ) THEN
    CREATE POLICY "Admins can update publishers"
      ON public.publishers FOR UPDATE
      TO authenticated
      USING (public.is_admin())
      WITH CHECK (public.is_admin());
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'Admins can delete publishers' AND tablename = 'publishers'
  ) THEN
    CREATE POLICY "Admins can delete publishers"
      ON public.publishers FOR DELETE
      TO authenticated
      USING (public.is_admin());
  END IF;
END $$;

-- message_templates: admin only
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'Admins can view message_templates' AND tablename = 'message_templates'
  ) THEN
    CREATE POLICY "Admins can view message_templates"
      ON public.message_templates FOR SELECT
      TO authenticated
      USING (public.is_admin());
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'Admins can modify message_templates' AND tablename = 'message_templates'
  ) THEN
    CREATE POLICY "Admins can modify message_templates"
      ON public.message_templates FOR UPDATE
      TO authenticated
      USING (public.is_admin())
      WITH CHECK (public.is_admin());
  END IF;
END $$;

-- users table: admins can view all, users can view own
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'Admins can view all users' AND tablename = 'users'
  ) THEN
    CREATE POLICY "Admins can view all users"
      ON public.users FOR SELECT
      TO authenticated
      USING (public.is_admin());
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'Admins can update users' AND tablename = 'users'
  ) THEN
    CREATE POLICY "Admins can update users"
      ON public.users FOR UPDATE
      TO authenticated
      USING (public.is_admin())
      WITH CHECK (public.is_admin());
  END IF;
END $$;

-- user_overrides: admin only
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'Admins can view user_overrides' AND tablename = 'user_overrides'
  ) THEN
    CREATE POLICY "Admins can view user_overrides"
      ON public.user_overrides FOR SELECT
      TO authenticated
      USING (public.is_admin());
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'Admins can insert user_overrides' AND tablename = 'user_overrides'
  ) THEN
    CREATE POLICY "Admins can insert user_overrides"
      ON public.user_overrides FOR INSERT
      TO authenticated
      WITH CHECK (public.is_admin());
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'Admins can modify user_overrides' AND tablename = 'user_overrides'
  ) THEN
    CREATE POLICY "Admins can modify user_overrides"
      ON public.user_overrides FOR UPDATE
      TO authenticated
      USING (public.is_admin())
      WITH CHECK (public.is_admin());
  END IF;
END $$;

-- ai_usage_limits: admin only
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'Admins can view ai_usage_limits' AND tablename = 'ai_usage_limits'
  ) THEN
    CREATE POLICY "Admins can view ai_usage_limits"
      ON public.ai_usage_limits FOR SELECT
      TO authenticated
      USING (public.is_admin());
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'Admins can modify ai_usage_limits' AND tablename = 'ai_usage_limits'
  ) THEN
    CREATE POLICY "Admins can modify ai_usage_limits"
      ON public.ai_usage_limits FOR UPDATE
      TO authenticated
      USING (public.is_admin())
      WITH CHECK (public.is_admin());
  END IF;
END $$;

-- price_versions: admin only
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'Admins can view price_versions' AND tablename = 'price_versions'
  ) THEN
    CREATE POLICY "Admins can view price_versions"
      ON public.price_versions FOR SELECT
      TO authenticated
      USING (public.is_admin());
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'Admins can modify price_versions' AND tablename = 'price_versions'
  ) THEN
    CREATE POLICY "Admins can modify price_versions"
      ON public.price_versions FOR UPDATE
      TO authenticated
      USING (public.is_admin())
      WITH CHECK (public.is_admin());
  END IF;
END $$;