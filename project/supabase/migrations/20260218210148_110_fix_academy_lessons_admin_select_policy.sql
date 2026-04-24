/*
  # Fix academy_lessons admin SELECT policy

  ## Problem
  Same issue as academy_modules: the SELECT policy only allows viewing lessons
  of published courses. When an admin inserts a lesson and the query uses
  .insert().select(), the select fails with RLS error because the course is draft.

  ## Fix
  Add a separate SELECT policy for admins using JWT-based role check (consistent
  with other admin policies) to allow viewing all lessons regardless of publish state.
*/

CREATE POLICY "Admins can view all lessons"
  ON academy_lessons FOR SELECT
  TO authenticated
  USING ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');
