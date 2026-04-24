/*
  # Sync Supabase Auth Users to Public Users Table

  Creates trigger to automatically sync auth.users to public.users on signup
*/

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
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
    '',
    'writer',
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

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

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