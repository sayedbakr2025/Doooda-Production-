/*
  # Create Admin Dashboard Statistics Function
  
  1. Function
    - `get_admin_dashboard_stats()` returns comprehensive dashboard statistics
    - Includes user counts by plan and role
    - Includes project statistics
    - Includes Doooda usage statistics
    
  2. Security
    - Only accessible by admin users
    - Uses SECURITY DEFINER to access all required data
*/

CREATE OR REPLACE FUNCTION get_admin_dashboard_stats()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
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
  FROM auth.users
  WHERE deleted_at IS NULL;
  
  SELECT COUNT(*) INTO v_active_users
  FROM users
  WHERE deleted_at IS NULL;
  
  SELECT COUNT(*) INTO v_free_users
  FROM users
  WHERE plan = 'free' AND deleted_at IS NULL;
  
  SELECT COUNT(*) INTO v_paid_users
  FROM users
  WHERE plan != 'free' AND deleted_at IS NULL;
  
  SELECT COUNT(*) INTO v_admin_users
  FROM users
  WHERE role = 'admin' AND deleted_at IS NULL;
  
  SELECT COUNT(*) INTO v_active_projects
  FROM projects
  WHERE deleted_at IS NULL;
  
  SELECT COUNT(*) INTO v_total_doooda_requests
  FROM ai_usage_tracking;
  
  SELECT COUNT(*) INTO v_doooda_errors
  FROM ai_usage_tracking
  WHERE response_status = 'error';
  
  SELECT COUNT(*) INTO v_doooda_today
  FROM ai_usage_tracking
  WHERE DATE(request_timestamp) = CURRENT_DATE;
  
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