/*
  # Add foreign key from academy_challenge_submissions.user_id to public.users

  ## Problem
  The academy_challenge_submissions table has user_id referencing auth.users only,
  but the admin panel tries to join with public.users table to get user details
  (email, first_name, last_name, pen_name). Without a foreign key to public.users,
  PostgREST cannot resolve the join and the query fails silently, returning no submissions.

  ## Changes
  - Add foreign key constraint from academy_challenge_submissions.user_id -> public.users(id)

  ## Notes
  - Uses IF NOT EXISTS pattern via DO block to be safe
  - No data loss possible — only adding a constraint
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'academy_challenge_submissions_user_id_public_fkey'
      AND table_name = 'academy_challenge_submissions'
  ) THEN
    ALTER TABLE academy_challenge_submissions
      ADD CONSTRAINT academy_challenge_submissions_user_id_public_fkey
      FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;
  END IF;
END $$;
