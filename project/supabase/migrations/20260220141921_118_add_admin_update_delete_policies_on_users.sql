/*
  # Add Admin UPDATE and DELETE Policies on users table

  ## Problem
  Admins could not update user plan, tokens, or role because the only UPDATE/DELETE
  policy on the `users` table was `users_self_policy` which only allows users to
  modify their own row (id = auth.uid()).

  ## Changes
  - Add UPDATE policy for admins: allows admins to update any user row
  - Add DELETE policy for admins: allows admins to delete any user row

  ## Security
  - Admin check uses JWT app_metadata role to avoid recursive RLS
  - Admins can only update/delete — not bypass row ownership for regular users
*/

CREATE POLICY "users_admin_update_policy"
  ON public.users
  FOR UPDATE
  TO authenticated
  USING (((auth.jwt() -> 'app_metadata') ->> 'role') = 'admin')
  WITH CHECK (((auth.jwt() -> 'app_metadata') ->> 'role') = 'admin');

CREATE POLICY "users_admin_delete_policy"
  ON public.users
  FOR DELETE
  TO authenticated
  USING (((auth.jwt() -> 'app_metadata') ->> 'role') = 'admin');
