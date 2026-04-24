/*
  # Fix get_admin_dashboard_stats function

  The function was referencing deleted_at on the users table which doesn't have that column.
  Users table uses created_at only - no soft delete. Projects table does have deleted_at.

  Changes:
  - Remove deleted_at filter from users-related queries
  - Keep deleted_at filter only for projects (which has the column)
*/

CREATE OR REPLACE FUNCTION public.get_admin_dashboard_stats()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result json;
  v_total_users integer;
  v_active_users integer;
  v_free_users integer;
  v_paid_users integer;
  v_admin_users integer;
  v_active_projects integer;
  v_total_doooda_requests integer;
  v_doooda_errors integer;
  v_doooda_today integer;
BEGIN
  SELECT COUNT(*) INTO v_total_users
  FROM auth.users;

  SELECT COUNT(*) INTO v_active_users
  FROM users;

  SELECT COUNT(*) INTO v_free_users
  FROM users
  WHERE plan = 'free';

  SELECT COUNT(*) INTO v_paid_users
  FROM users
  WHERE plan != 'free';

  SELECT COUNT(*) INTO v_admin_users
  FROM users
  WHERE role = 'admin';

  SELECT COUNT(*) INTO v_active_projects
  FROM projects
  WHERE deleted_at IS NULL;

  SELECT COUNT(*) INTO v_total_doooda_requests
  FROM ai_usage_logs;

  SELECT COUNT(*) INTO v_doooda_errors
  FROM ai_usage_logs
  WHERE status = 'error';

  SELECT COUNT(*) INTO v_doooda_today
  FROM ai_usage_logs
  WHERE DATE(created_at) = CURRENT_DATE;

  result := json_build_object(
    'total_users', COALESCE(v_total_users, 0),
    'active_users', COALESCE(v_active_users, 0),
    'free_users', COALESCE(v_free_users, 0),
    'paid_users', COALESCE(v_paid_users, 0),
    'admin_users', COALESCE(v_admin_users, 0),
    'active_projects', COALESCE(v_active_projects, 0),
    'total_doooda_requests', COALESCE(v_total_doooda_requests, 0),
    'doooda_errors', COALESCE(v_doooda_errors, 0),
    'doooda_today', COALESCE(v_doooda_today, 0)
  );

  RETURN result;
END;
$$;
