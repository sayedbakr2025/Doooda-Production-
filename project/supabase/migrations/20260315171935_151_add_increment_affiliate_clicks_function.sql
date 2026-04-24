/*
  # Add helper function for incrementing affiliate click counter

  Creates increment_affiliate_clicks RPC function used by the affiliate-auth edge function.
*/

CREATE OR REPLACE FUNCTION increment_affiliate_clicks(p_affiliate_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE affiliates SET total_clicks = total_clicks + 1, updated_at = now() WHERE id = p_affiliate_id;
END;
$$;
