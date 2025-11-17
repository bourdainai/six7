/**
 * Simple script to add 3 Pokemon card listings
 * Run with: node add-pokemon-cards.js
 * 
 * Make sure you have VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your .env file
 * or set them as environment variables
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: join(__dirname, '.env.local') });
dotenv.config({ path: join(__dirname, '.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase environment variables!');
  console.error('Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY');
  console.error('\nYou can find these in your Supabase project settings.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const pokemonCards = [
  {
    title: 'Charizard Base Set Holo #4 - Near Mint Condition',
    description: 'Authentic Charizard Base Set holographic card from the original 1999 Pokemon Base Set. This is one of the most sought-after cards in the entire Pokemon TCG. Card is in Near Mint condition with minimal edge wear and excellent centering. The holographic foil is pristine with no scratches or clouding. Back shows minimal whitening on edges. This card has been stored in a protective sleeve and top loader since purchase. PSA grading potential: 7-8. A true grail card for any Pokemon collector.',
    category: 'Trading Cards',
    subcategory: 'Gaming',
    brand: 'Pokemon',
    condition: 'excellent',
    original_rrp: 4.99,
    seller_price: 850.00,
    suggested_price: 800.00,
    quick_sale_price: 750.00,
    ambitious_price: 950.00,
    size: 'Standard',
    color: 'Red/Orange/Yellow',
    material: 'Card Stock',
    style_tags: ['vintage', 'holo', 'base set', 'charizard', 'collectible', 'rare'],
    images: [
      'https://images.unsplash.com/photo-1606107557195-0e29a4b5b4aa?w=800&h=1000&fit=crop',
      'https://images.unsplash.com/photo-1606107557195-0e29a4b5b4aa?w=800&h=1000&fit=crop',
      'https://images.unsplash.com/photo-1606107557195-0e29a4b5b4aa?w=800&h=1000&fit=crop',
    ],
  },
  {
    title: 'Pikachu Yellow Cheeks Base Set #58 - Mint Condition',
    description: 'Rare Pikachu card from the original 1999 Base Set with the coveted "Yellow Cheeks" variant. This is the corrected version that was only printed in the first print run, making it significantly rarer than the red cheeks version. Card is in Mint condition - looks like it just came out of the pack. Perfect centering, no edge wear, pristine surface with no scratches. The yellow cheeks detail is clearly visible and vibrant. This card has been kept in a protective case since opening. PSA grading potential: 9-10. An extremely rare find in this condition.',
    category: 'Trading Cards',
    subcategory: 'Gaming',
    brand: 'Pokemon',
    condition: 'like_new',
    original_rrp: 4.99,
    seller_price: 450.00,
    suggested_price: 425.00,
    quick_sale_price: 400.00,
    ambitious_price: 500.00,
    size: 'Standard',
    color: 'Yellow',
    material: 'Card Stock',
    style_tags: ['vintage', 'rare variant', 'base set', 'pikachu', 'collectible', 'mint'],
    images: [
      'https://images.unsplash.com/photo-1606107557195-0e29a4b5b4aa?w=800&h=1000&fit=crop',
      'https://images.unsplash.com/photo-1606107557195-0e29a4b5b4aa?w=800&h=1000&fit=crop',
    ],
  },
  {
    title: 'Blastoise Base Set Holo #2 - Excellent Condition',
    description: 'Authentic Blastoise holographic card from the original 1999 Pokemon Base Set. This is one of the three original starter evolution holos alongside Charizard and Venusaur. Card is in Excellent condition with very minor edge wear and excellent centering. The holographic foil shows beautifully with only minor surface scratches that are only visible under direct light. Back has minimal whitening on corners. This card has been carefully stored in a protective sleeve. PSA grading potential: 6-7. A classic card that completes the original starter trio.',
    category: 'Trading Cards',
    subcategory: 'Gaming',
    brand: 'Pokemon',
    condition: 'excellent',
    original_rrp: 4.99,
    seller_price: 320.00,
    suggested_price: 300.00,
    quick_sale_price: 280.00,
    ambitious_price: 360.00,
    size: 'Standard',
    color: 'Blue',
    material: 'Card Stock',
    style_tags: ['vintage', 'holo', 'base set', 'blastoise', 'collectible', 'starter'],
    images: [
      'https://images.unsplash.com/photo-1606107557195-0e29a4b5b4aa?w=800&h=1000&fit=crop',
      'https://images.unsplash.com/photo-1606107557195-0e29a4b5b4aa?w=800&h=1000&fit=crop',
      'https://images.unsplash.com/photo-1606107557195-0e29a4b5b4aa?w=800&h=1000&fit=crop',
    ],
  },
];

async function addPokemonCards() {
  try {
    console.log('🔍 Checking for seller profiles...');
    
    // Get first seller profile
    const { data: profiles, error: profileError } = await supabase
      .from('profiles')
      .select('id')
      .limit(1);

    if (profileError) {
      console.error('❌ Error fetching profiles:', profileError.message);
      process.exit(1);
    }

    if (!profiles || profiles.length === 0) {
      console.error('❌ No seller profiles found!');
      console.error('Please create a seller account first by signing up on the site.');
      process.exit(1);
    }

    const sellerId = profiles[0].id;
    console.log(`✅ Using seller ID: ${sellerId}\n`);

    // Add each Pokemon card
    for (const card of pokemonCards) {
      console.log(`📦 Adding: ${card.title}`);

      // Create listing
      const { data: listing, error: listingError } = await supabase
        .from('listings')
        .insert({
          seller_id: sellerId,
          title: card.title,
          description: card.description,
          category: card.category,
          subcategory: card.subcategory,
          brand: card.brand,
          condition: card.condition,
          original_rrp: card.original_rrp,
          seller_price: card.seller_price,
          suggested_price: card.suggested_price,
          quick_sale_price: card.quick_sale_price,
          ambitious_price: card.ambitious_price,
          currency: 'GBP',
          style_tags: card.style_tags,
          status: 'active',
          size: card.size,
          color: card.color,
          material: card.material,
          free_shipping: false,
          shipping_cost_uk: 3.99,
          shipping_cost_europe: 5.99,
          shipping_cost_international: 8.99,
          estimated_delivery_days: 2,
          package_weight: 0.01,
          package_dimensions: { length: 6.3, width: 8.8, height: 0.1 },
          published_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (listingError) {
        console.error(`❌ Error creating listing:`, listingError.message);
        continue;
      }

      console.log(`   ✓ Created listing: ${listing.id}`);

      // Add images
      const imageInserts = card.images.map((imageUrl, index) => ({
        listing_id: listing.id,
        image_url: imageUrl,
        display_order: index,
      }));

      const { error: imageError } = await supabase
        .from('listing_images')
        .insert(imageInserts);

      if (imageError) {
        console.error(`   ❌ Error adding images:`, imageError.message);
      } else {
        console.log(`   ✓ Added ${card.images.length} images`);
      }
      console.log('');
    }

    console.log('✅ Successfully added 3 Pokemon card listings!');
    console.log('\n🌐 View them at: http://localhost:8080/browse');
    console.log('   (Refresh the page if it\'s already open)');
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

addPokemonCards();

