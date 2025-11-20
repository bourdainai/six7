import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL!;
const supabaseKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

async function createSampleListings() {
  try {
    // Get 20 pokemon cards from the database
    const { data: cards, error: cardsError } = await supabase
      .from('pokemon_card_attributes')
      .select('*')
      .limit(20);

    if (cardsError) throw cardsError;
    if (!cards || cards.length === 0) {
      console.log('No cards found in database');
      return;
    }

    // Get a seller ID (you'll need to replace this with an actual seller ID)
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id')
      .limit(1);

    if (!profiles || profiles.length === 0) {
      console.log('No profiles found. Please create a user account first.');
      return;
    }

    const sellerId = profiles[0].id;
    console.log(`Creating listings for seller: ${sellerId}`);

    for (const card of cards) {
      // Extract price from tcgplayer_prices or cardmarket_prices
      let price = 50; // default price
      if (card.tcgplayer_prices) {
        const prices = typeof card.tcgplayer_prices === 'string' 
          ? JSON.parse(card.tcgplayer_prices) 
          : card.tcgplayer_prices;
        if (prices.holofoil?.market) {
          price = prices.holofoil.market;
        } else if (prices.normal?.market) {
          price = prices.normal.market;
        }
      } else if (card.cardmarket_prices) {
        const prices = typeof card.cardmarket_prices === 'string'
          ? JSON.parse(card.cardmarket_prices)
          : card.cardmarket_prices;
        if (prices.averageSellPrice) {
          price = prices.averageSellPrice;
        }
      }

      // Create listing
      const { data: listing, error: listingError } = await supabase
        .from('listings')
        .insert({
          seller_id: sellerId,
          title: `${card.name} - ${card.set_name}`,
          description: `${card.name} from ${card.set_name}. ${card.rarity ? `Rarity: ${card.rarity}.` : ''} Authentic Pokémon card in excellent condition.`,
          seller_price: price,
          quick_sale_price: price * 0.9,
          condition: 'excellent',
          category: 'Trading Cards',
          subcategory: 'Pokémon',
          brand: 'Pokémon',
          status: 'active',
          card_id: card.card_id,
          set_code: card.set_code,
          trade_enabled: true,
          free_shipping: false,
          shipping_cost_uk: 2.50,
          shipping_cost_europe: 5.00,
          shipping_cost_international: 8.00,
          currency: 'GBP',
          published_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (listingError) {
        console.error(`Error creating listing for ${card.name}:`, listingError);
        continue;
      }

      console.log(`Created listing: ${listing.title} (£${price})`);

      // Add card image as listing image
      if (card.images && listing) {
        const images = typeof card.images === 'string' 
          ? JSON.parse(card.images) 
          : card.images;
        
        const imageUrl = images.large || images.small;
        
        if (imageUrl) {
          const { error: imageError } = await supabase
            .from('listing_images')
            .insert({
              listing_id: listing.id,
              image_url: imageUrl,
              display_order: 0,
            });

          if (imageError) {
            console.error(`Error adding image for ${card.name}:`, imageError);
          }
        }
      }
    }

    console.log('\nSuccessfully created sample listings!');
  } catch (error) {
    console.error('Error:', error);
  }
}

createSampleListings();
