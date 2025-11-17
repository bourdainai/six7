-- Add 3 Pokemon Card Listings with Full Details
-- Run this in your Supabase SQL Editor

-- Pokemon Card 1: Charizard Base Set Holo
WITH charizard_listing AS (
  INSERT INTO listings (
    seller_id,
    title,
    description,
    category,
    subcategory,
    brand,
    condition,
    original_rrp,
    seller_price,
    suggested_price,
    quick_sale_price,
    ambitious_price,
    currency,
    style_tags,
    status,
    size,
    color,
    material,
    free_shipping,
    shipping_cost_uk,
    shipping_cost_europe,
    shipping_cost_international,
    estimated_delivery_days,
    package_weight,
    package_dimensions,
    published_at
  ) VALUES (
    (SELECT id FROM profiles LIMIT 1),
    'Charizard Base Set Holo #4 - Near Mint Condition',
    'Authentic Charizard Base Set holographic card from the original 1999 Pokemon Base Set. This is one of the most sought-after cards in the entire Pokemon TCG. Card is in Near Mint condition with minimal edge wear and excellent centering. The holographic foil is pristine with no scratches or clouding. Back shows minimal whitening on edges. This card has been stored in a protective sleeve and top loader since purchase. PSA grading potential: 7-8. A true grail card for any Pokemon collector.',
    'Trading Cards',
    'Gaming',
    'Pokemon',
    'excellent',
    4.99,
    850.00,
    800.00,
    750.00,
    950.00,
    'GBP',
    '["vintage", "holo", "base set", "charizard", "collectible", "rare"]'::jsonb,
    'active',
    'Standard',
    'Red/Orange/Yellow',
    'Card Stock',
    false,
    3.99,
    5.99,
    8.99,
    2,
    0.01,
    '{"length": 6.3, "width": 8.8, "height": 0.1}'::jsonb,
    NOW()
  )
  RETURNING id
)
INSERT INTO listing_images (listing_id, image_url, display_order)
SELECT id, 'https://images.unsplash.com/photo-1606107557195-0e29a4b5b4aa?w=800&h=1000&fit=crop', 0 FROM charizard_listing
UNION ALL
SELECT id, 'https://images.unsplash.com/photo-1606107557195-0e29a4b5b4aa?w=800&h=1000&fit=crop', 1 FROM charizard_listing
UNION ALL
SELECT id, 'https://images.unsplash.com/photo-1606107557195-0e29a4b5b4aa?w=800&h=1000&fit=crop', 2 FROM charizard_listing;

-- Pokemon Card 2: Pikachu Yellow Cheeks
WITH pikachu_listing AS (
  INSERT INTO listings (
    seller_id,
    title,
    description,
    category,
    subcategory,
    brand,
    condition,
    original_rrp,
    seller_price,
    suggested_price,
    quick_sale_price,
    ambitious_price,
    currency,
    style_tags,
    status,
    size,
    color,
    material,
    free_shipping,
    shipping_cost_uk,
    shipping_cost_europe,
    shipping_cost_international,
    estimated_delivery_days,
    package_weight,
    package_dimensions,
    published_at
  ) VALUES (
    (SELECT id FROM profiles LIMIT 1),
    'Pikachu Yellow Cheeks Base Set #58 - Mint Condition',
    'Rare Pikachu card from the original 1999 Base Set with the coveted "Yellow Cheeks" variant. This is the corrected version that was only printed in the first print run, making it significantly rarer than the red cheeks version. Card is in Mint condition - looks like it just came out of the pack. Perfect centering, no edge wear, pristine surface with no scratches. The yellow cheeks detail is clearly visible and vibrant. This card has been kept in a protective case since opening. PSA grading potential: 9-10. An extremely rare find in this condition.',
    'Trading Cards',
    'Gaming',
    'Pokemon',
    'like_new',
    4.99,
    450.00,
    425.00,
    400.00,
    500.00,
    'GBP',
    '["vintage", "rare variant", "base set", "pikachu", "collectible", "mint"]'::jsonb,
    'active',
    'Standard',
    'Yellow',
    'Card Stock',
    false,
    3.99,
    5.99,
    8.99,
    2,
    0.01,
    '{"length": 6.3, "width": 8.8, "height": 0.1}'::jsonb,
    NOW()
  )
  RETURNING id
)
INSERT INTO listing_images (listing_id, image_url, display_order)
SELECT id, 'https://images.unsplash.com/photo-1606107557195-0e29a4b5b4aa?w=800&h=1000&fit=crop', 0 FROM pikachu_listing
UNION ALL
SELECT id, 'https://images.unsplash.com/photo-1606107557195-0e29a4b5b4aa?w=800&h=1000&fit=crop', 1 FROM pikachu_listing;

-- Pokemon Card 3: Blastoise Base Set Holo
WITH blastoise_listing AS (
  INSERT INTO listings (
    seller_id,
    title,
    description,
    category,
    subcategory,
    brand,
    condition,
    original_rrp,
    seller_price,
    suggested_price,
    quick_sale_price,
    ambitious_price,
    currency,
    style_tags,
    status,
    size,
    color,
    material,
    free_shipping,
    shipping_cost_uk,
    shipping_cost_europe,
    shipping_cost_international,
    estimated_delivery_days,
    package_weight,
    package_dimensions,
    published_at
  ) VALUES (
    (SELECT id FROM profiles LIMIT 1),
    'Blastoise Base Set Holo #2 - Excellent Condition',
    'Authentic Blastoise holographic card from the original 1999 Pokemon Base Set. This is one of the three original starter evolution holos alongside Charizard and Venusaur. Card is in Excellent condition with very minor edge wear and excellent centering. The holographic foil shows beautifully with only minor surface scratches that are only visible under direct light. Back has minimal whitening on corners. This card has been carefully stored in a protective sleeve. PSA grading potential: 6-7. A classic card that completes the original starter trio.',
    'Trading Cards',
    'Gaming',
    'Pokemon',
    'excellent',
    4.99,
    320.00,
    300.00,
    280.00,
    360.00,
    'GBP',
    '["vintage", "holo", "base set", "blastoise", "collectible", "starter"]'::jsonb,
    'active',
    'Standard',
    'Blue',
    'Card Stock',
    false,
    3.99,
    5.99,
    8.99,
    2,
    0.01,
    '{"length": 6.3, "width": 8.8, "height": 0.1}'::jsonb,
    NOW()
  )
  RETURNING id
)
INSERT INTO listing_images (listing_id, image_url, display_order)
SELECT id, 'https://images.unsplash.com/photo-1606107557195-0e29a4b5b4aa?w=800&h=1000&fit=crop', 0 FROM blastoise_listing
UNION ALL
SELECT id, 'https://images.unsplash.com/photo-1606107557195-0e29a4b5b4aa?w=800&h=1000&fit=crop', 1 FROM blastoise_listing
UNION ALL
SELECT id, 'https://images.unsplash.com/photo-1606107557195-0e29a4b5b4aa?w=800&h=1000&fit=crop', 2 FROM blastoise_listing;

