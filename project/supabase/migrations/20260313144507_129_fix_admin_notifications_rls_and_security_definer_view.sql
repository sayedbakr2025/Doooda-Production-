
/*
  # Fix Security Issues: RLS Policy and Security Definer View

  ## Changes

  1. admin_notifications table
     - Drop the permissive INSERT policy that allows any authenticated user to insert
     - Replace with a restricted policy that only allows system/admin inserts

  2. community_active_writers view
     - Drop and recreate without SECURITY DEFINER so it respects the querying user's permissions

  3. doooda_usage_logs table
     - Enable RLS
     - Add policy for users to read only their own usage logs
     - Add policy for admins to read all logs
*/

-- Fix admin_notifications INSERT policy
DROP POLICY IF EXISTS "Anyone authenticated can insert notifications" ON admin_notifications;

CREATE POLICY "System can insert notifications"
  ON admin_notifications
  FOR INSERT
  TO authenticated
  WITH CHECK (
    (SELECT role FROM users WHERE id = auth.uid()) = 'admin'
  );

-- Fix community_active_writers view - recreate without SECURITY DEFINER
DROP VIEW IF EXISTS public.community_active_writers;

CREATE VIEW public.community_active_writers
  WITH (security_invoker = true)
AS
SELECT
  s.user_id,
  COALESCE(u.pen_name, u.first_name, split_part(u.email, '@', 1)) AS display_name,
  u.email,
  s.points,
  s.topics_created,
  s.replies_count,
  s.badges_count,
  s.reputation_level
FROM community_user_stats s
JOIN users u ON u.id = s.user_id
ORDER BY s.points DESC
LIMIT 10;

-- Enable RLS on doooda_usage_logs
ALTER TABLE IF EXISTS public.doooda_usage_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own usage logs"
  ON public.doooda_usage_logs
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can read all usage logs"
  ON public.doooda_usage_logs
  FOR SELECT
  TO authenticated
  USING (
    (SELECT role FROM users WHERE id = auth.uid()) = 'admin'
  );

CREATE POLICY "Service role can insert usage logs"
  ON public.doooda_usage_logs
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);
