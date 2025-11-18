import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.81.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (authError || !user) {
      throw new Error('Unauthorized');
    }

    const { listingId, feedbackType } = await req.json();

    if (!listingId || !feedbackType) {
      throw new Error('listingId and feedbackType are required');
    }

    console.log('Recording feedback:', { user: user.id, listingId, feedbackType });

    // Record feedback
    const { error: feedbackError } = await supabase
      .from('buyer_agent_feedback')
      .insert({
        user_id: user.id,
        listing_id: listingId,
        feedback_type: feedbackType,
      });

    if (feedbackError) {
      console.error('Error recording feedback:', feedbackError);
      throw feedbackError;
    }

    // Get listing details to update preferences
    const { data: listing } = await supabase
      .from('listings')
      .select('*')
      .eq('id', listingId)
      .single();

    if (!listing) {
      throw new Error('Listing not found');
    }

    // Get current preferences
    const { data: currentPrefs, error: prefsError } = await supabase
      .from('user_preferences')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (prefsError && prefsError.code !== 'PGRST116') {
      console.error('Error fetching preferences:', prefsError);
      throw prefsError;
    }

    // Update preferences based on feedback
      const updatedPrefs = currentPrefs || {
      user_id: user.id,
      brands: [],
      categories: [],
      sizes: [],
      colors: [],
      style_tags: [],
    };

    if (feedbackType === 'liked' || feedbackType === 'saved' || feedbackType === 'purchased') {
      // Positive feedback - reinforce preferences
      if (listing.brand) {
        const brands = (updatedPrefs.brands as string[]) || [];
        if (!brands.includes(listing.brand)) {
          brands.push(listing.brand);
          updatedPrefs.brands = brands;
        }
      }

      if (listing.category) {
        const categories = (updatedPrefs.categories as string[]) || [];
        if (!categories.includes(listing.category)) {
          categories.push(listing.category);
          updatedPrefs.categories = categories;
        }
      }

      if (listing.size) {
        const sizes = (updatedPrefs.sizes as string[]) || [];
        if (!sizes.includes(listing.size)) {
          sizes.push(listing.size);
          updatedPrefs.sizes = sizes;
        }
      }

      if (listing.color) {
        const colors = (updatedPrefs.colors as string[]) || [];
        if (!colors.includes(listing.color)) {
          colors.push(listing.color);
          updatedPrefs.colors = colors;
        }
      }

      if (listing.style_tags) {
        const existingTags = (updatedPrefs.style_tags as string[]) || [];
        const listingTags = (listing.style_tags as string[]) || [];
        const newTags = [...new Set([...existingTags, ...listingTags])];
        updatedPrefs.style_tags = newTags;
      }
    } else if (feedbackType === 'hidden') {
      // Negative feedback - we could remove or deprioritize
      // For now, just log it (more complex logic could be added)
      console.log('User hid listing, considering preference adjustment');
    }

    // Upsert preferences
    const { error: upsertError } = await supabase
      .from('user_preferences')
      .upsert(updatedPrefs, { onConflict: 'user_id' });

    if (upsertError) {
      console.error('Error updating preferences:', upsertError);
      throw upsertError;
    }

    console.log('Feedback recorded and preferences updated');

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          feedback_recorded: true,
          preferences_updated: true,
        },
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in buyer agent learn:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
