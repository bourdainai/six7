-- Set up super admin role for gavin@bourdain.co.uk
-- First, create a function to safely add admin role
CREATE OR REPLACE FUNCTION public.ensure_admin_role()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  admin_user_id uuid;
BEGIN
  -- Find user by email
  SELECT id INTO admin_user_id
  FROM auth.users
  WHERE email = 'gavin@bourdain.co.uk'
  LIMIT 1;

  -- If user exists, ensure they have admin role
  IF admin_user_id IS NOT NULL THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (admin_user_id, 'admin')
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;
END;
$$;

-- Insert sample listings with proper structure
INSERT INTO public.listings (
  id,
  seller_id,
  title,
  description,
  category,
  subcategory,
  brand,
  size,
  color,
  material,
  condition,
  seller_price,
  suggested_price,
  quick_sale_price,
  ambitious_price,
  original_rrp,
  status,
  views,
  saves,
  style_tags,
  currency
) VALUES
  (
    gen_random_uuid(),
    (SELECT id FROM auth.users WHERE email = 'gavin@bourdain.co.uk' LIMIT 1),
    'Vintage Levi''s 501 Jeans',
    'Classic straight-leg denim jeans in excellent condition. Authentic vintage Levi''s with minimal wear. Perfect for any casual outfit.',
    'Bottoms',
    'Jeans',
    'Levi''s',
    '32x32',
    'Dark Blue',
    'Denim',
    'excellent',
    85.00,
    80.00,
    65.00,
    95.00,
    120.00,
    'active',
    45,
    12,
    '["vintage", "casual", "streetwear"]'::jsonb,
    'GBP'
  ),
  (
    gen_random_uuid(),
    (SELECT id FROM auth.users WHERE email = 'gavin@bourdain.co.uk' LIMIT 1),
    'Nike Air Max 97 Silver Bullet',
    'Iconic Nike Air Max 97 in the legendary Silver Bullet colorway. Light wear on soles, upper in pristine condition. Comes with original box.',
    'Shoes',
    'Sneakers',
    'Nike',
    'UK 10',
    'Silver',
    'Leather/Mesh',
    'good',
    145.00,
    140.00,
    120.00,
    160.00,
    190.00,
    'active',
    89,
    24,
    '["streetwear", "athletic", "retro"]'::jsonb,
    'GBP'
  ),
  (
    gen_random_uuid(),
    (SELECT id FROM auth.users WHERE email = 'gavin@bourdain.co.uk' LIMIT 1),
    'Carhartt WIP Detroit Jacket',
    'Classic workwear-inspired jacket from Carhartt WIP. Durable cotton canvas with quilted lining. Minimal signs of wear, perfect for layering.',
    'Outerwear',
    'Jacket',
    'Carhartt WIP',
    'L',
    'Black',
    'Cotton Canvas',
    'like_new',
    95.00,
    90.00,
    75.00,
    110.00,
    150.00,
    'active',
    67,
    18,
    '["workwear", "streetwear", "minimalist"]'::jsonb,
    'GBP'
  ),
  (
    gen_random_uuid(),
    (SELECT id FROM auth.users WHERE email = 'gavin@bourdain.co.uk' LIMIT 1),
    'Patagonia Better Sweater Fleece',
    'Cozy and sustainable fleece jacket from Patagonia. Great for layering or wearing solo. Excellent condition with no pilling or damage.',
    'Outerwear',
    'Fleece',
    'Patagonia',
    'M',
    'Navy Blue',
    'Polyester Fleece',
    'excellent',
    65.00,
    60.00,
    50.00,
    75.00,
    100.00,
    'active',
    34,
    9,
    '["outdoor", "casual", "sustainable"]'::jsonb,
    'GBP'
  );

-- Insert sample orders
INSERT INTO public.orders (
  id,
  buyer_id,
  seller_id,
  total_amount,
  seller_amount,
  platform_fee,
  currency,
  status,
  shipping_address
) VALUES
  (
    gen_random_uuid(),
    (SELECT id FROM auth.users WHERE email = 'gavin@bourdain.co.uk' LIMIT 1),
    (SELECT id FROM auth.users WHERE email = 'gavin@bourdain.co.uk' LIMIT 1),
    85.00,
    76.50,
    8.50,
    'GBP',
    'paid',
    '{"name": "Gavin Bourdain", "line1": "123 Fashion Street", "city": "London", "postcode": "E1 6AN", "country": "UK"}'::jsonb
  );

-- Call the function to ensure admin role is set
SELECT public.ensure_admin_role();