-- Create function to get top sellers by revenue
CREATE OR REPLACE FUNCTION get_top_sellers(limit_count integer DEFAULT 10)
RETURNS TABLE (
  id uuid,
  name text,
  revenue numeric,
  order_count bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public', 'pg_temp'
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id,
    COALESCE(p.full_name, p.email) as name,
    COALESCE(SUM(o.seller_amount), 0) as revenue,
    COUNT(o.id) as order_count
  FROM profiles p
  LEFT JOIN orders o ON o.seller_id = p.id AND o.status IN ('paid', 'completed')
  GROUP BY p.id, p.full_name, p.email
  HAVING COUNT(o.id) > 0
  ORDER BY revenue DESC
  LIMIT limit_count;
END;
$$;

-- Create function to get top buyers by spend
CREATE OR REPLACE FUNCTION get_top_buyers(limit_count integer DEFAULT 10)
RETURNS TABLE (
  id uuid,
  name text,
  spend numeric,
  order_count bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public', 'pg_temp'
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id,
    COALESCE(p.full_name, p.email) as name,
    COALESCE(SUM(o.total_amount), 0) as spend,
    COUNT(o.id) as order_count
  FROM profiles p
  LEFT JOIN orders o ON o.buyer_id = p.id AND o.status IN ('paid', 'completed')
  GROUP BY p.id, p.full_name, p.email
  HAVING COUNT(o.id) > 0
  ORDER BY spend DESC
  LIMIT limit_count;
END;
$$;