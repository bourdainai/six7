-- Insert diverse product listings

-- Pokemon Charizard Card
INSERT INTO listings (
  id, seller_id, title, description, category, subcategory, brand, 
  condition, original_rrp, seller_price, suggested_price, quick_sale_price, 
  ambitious_price, currency, style_tags, status
) VALUES (
  gen_random_uuid(),
  '2c7420e7-ee04-42c5-81f2-ffcedd23d8f5',
  'Holographic Charizard Pokemon Card - Base Set',
  'Extremely rare holographic Charizard from the original Base Set. Card is in near-mint condition with vibrant colors and minimal wear. A must-have for serious Pokemon TCG collectors. Comes in protective sleeve and toploader. One of the most iconic and valuable Pokemon cards ever printed.',
  'Trading Cards',
  'Pokemon',
  'Pokemon Company',
  'excellent',
  300.00,
  895.00,
  850.00,
  750.00,
  995.00,
  'GBP',
  '["vintage", "collectible", "rare", "holographic", "graded"]'::jsonb,
  'active'
);

-- Baseball Card
INSERT INTO listings (
  id, seller_id, title, description, category, subcategory, brand,
  condition, original_rrp, seller_price, suggested_price, quick_sale_price,
  ambitious_price, currency, style_tags, status
) VALUES (
  gen_random_uuid(),
  '2c7420e7-ee04-42c5-81f2-ffcedd23d8f5',
  '1952 Topps Mickey Mantle Baseball Card #311',
  'Legendary Mickey Mantle rookie card from 1952 Topps set. This is one of the most valuable baseball cards in existence. Card shows its age with authentic vintage patina but remains in excellent condition for its era. Sharp corners, good centering, and vibrant colors. A true investment piece for serious collectors.',
  'Trading Cards',
  'Baseball',
  'Topps',
  'good',
  5.00,
  12500.00,
  12000.00,
  10000.00,
  15000.00,
  'GBP',
  '["vintage", "collectible", "rookie card", "investment", "hall of fame"]'::jsonb,
  'active'
);

-- Game Boy Pokemon Red
INSERT INTO listings (
  id, seller_id, title, description, category, subcategory, brand,
  condition, original_rrp, seller_price, suggested_price, quick_sale_price,
  ambitious_price, currency, style_tags, status, size
) VALUES (
  gen_random_uuid(),
  '2c7420e7-ee04-42c5-81f2-ffcedd23d8f5',
  'Pokemon Red Version - Game Boy - Complete in Box',
  'Original Pokemon Red Version for Nintendo Game Boy in complete condition with box, manual, and cartridge. Box shows minimal shelf wear. Cartridge tested and working perfectly - save battery still functional. Manual in excellent condition. This is the game that started it all for millions of Pokemon trainers worldwide.',
  'Video Games',
  'Game Boy',
  'Nintendo',
  'like_new',
  39.99,
  245.00,
  230.00,
  195.00,
  275.00,
  'GBP',
  '["retro gaming", "complete in box", "nintendo", "pokemon", "collectible"]'::jsonb,
  'active',
  'Standard'
);

-- Canon AE-1 Camera
INSERT INTO listings (
  id, seller_id, title, description, category, subcategory, brand, color, material,
  condition, original_rrp, seller_price, suggested_price, quick_sale_price,
  ambitious_price, currency, style_tags, status
) VALUES (
  gen_random_uuid(),
  '2c7420e7-ee04-42c5-81f2-ffcedd23d8f5',
  'Canon AE-1 35mm Film Camera with 50mm Lens',
  'Iconic Canon AE-1 SLR camera in excellent working condition. Includes legendary Canon FD 50mm f/1.8 lens. Shutter fires at all speeds, light meter works perfectly, viewfinder is clean and bright. This is one of the most popular and reliable film cameras ever made. Perfect for beginners and experienced photographers alike. Body shows minor wear consistent with age but functions flawlessly.',
  'Electronics',
  'Cameras',
  'Canon',
  'Black/Silver',
  'Metal/Plastic',
  'excellent',
  299.00,
  185.00,
  175.00,
  145.00,
  210.00,
  'GBP',
  '["vintage", "film photography", "analog", "professional", "collectible"]'::jsonb,
  'active'
);

-- Harry Potter Book
INSERT INTO listings (
  id, seller_id, title, description, category, subcategory, brand,
  condition, original_rrp, seller_price, suggested_price, quick_sale_price,
  ambitious_price, currency, style_tags, status, size
) VALUES (
  gen_random_uuid(),
  '2c7420e7-ee04-42c5-81f2-ffcedd23d8f5',
  'Harry Potter and the Philosopher''s Stone - First Edition Hardcover',
  'Rare first edition hardcover of Harry Potter and the Philosopher''s Stone by J.K. Rowling. Published by Bloomsbury in 1997. Book is in near-mint condition with dust jacket intact. Minimal shelf wear, pages are clean and bright, binding is tight. One of approximately 500 first edition hardcovers printed. This is a true collector''s item and investment piece that continues to appreciate in value.',
  'Books',
  'Fiction',
  'Bloomsbury',
  'like_new',
  10.99,
  8500.00,
  8000.00,
  7000.00,
  9500.00,
  'GBP',
  '["first edition", "collectible", "rare", "investment", "literature"]'::jsonb,
  'active',
  'Hardcover'
);

-- Pink Floyd Vinyl
INSERT INTO listings (
  id, seller_id, title, description, category, subcategory, brand, color,
  condition, original_rrp, seller_price, suggested_price, quick_sale_price,
  ambitious_price, currency, style_tags, status, size
) VALUES (
  gen_random_uuid(),
  '2c7420e7-ee04-42c5-81f2-ffcedd23d8f5',
  'Pink Floyd - The Dark Side of the Moon - Original 1973 UK Pressing',
  'Original 1973 UK first pressing of Pink Floyd''s masterpiece "The Dark Side of the Moon" on Harvest Records. Vinyl is in near-mint condition with minimal surface noise. Album cover shows light wear but iconic prism artwork is vibrant and intact. Includes original posters and stickers. Matrix numbers confirm first pressing. This is one of the best-selling and most critically acclaimed albums of all time. Sounds phenomenal.',
  'Music',
  'Vinyl Records',
  'Harvest Records',
  'Black',
  'excellent',
  2.99,
  395.00,
  375.00,
  325.00,
  450.00,
  'GBP',
  '["vintage", "first pressing", "progressive rock", "collectible", "audiophile"]'::jsonb,
  'active',
  '12" LP'
);