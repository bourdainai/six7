import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { requireAdmin, handleCORS, createErrorResponse } from "../_shared/admin-middleware.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface MatchResult {
  card_id: string;
  name: string;
  set_name: string;
  confidence: number;
  matched_by: string[];
}

// Extract potential card name from listing title
function extractCardInfo(title: string): { name: string; set?: string; number?: string } {
  // Common patterns in Pokemon card listing titles
  // E.g., "Charizard VMAX 020/189 Darkness Ablaze"
  // E.g., "PSA 10 Pikachu 025/185 Vivid Voltage"
  
  const cleaned = title
    .replace(/PSA\s*\d+/gi, '')
    .replace(/CGC\s*[\d.]+/gi, '')
    .replace(/BGS\s*[\d.]+/gi, '')
    .replace(/\(.*?\)/g, '')
    .trim();

  // Try to extract card number (e.g., 020/189, #25, 025)
  const numberMatch = cleaned.match(/(\d{1,3})\s*[\/\\]\s*(\d{1,3})/);
  const hashNumberMatch = cleaned.match(/#?(\d{1,3})/);
  
  // Extract the main card name (usually first part before number)
  let name = cleaned;
  if (numberMatch) {
    name = cleaned.substring(0, cleaned.indexOf(numberMatch[0])).trim();
  }
  
  // Remove common suffixes
  name = name
    .replace(/\s+(EX|GX|V|VMAX|VSTAR|ex)\s*$/i, ' $1')
    .replace(/\s+Holo\s*$/i, '')
    .replace(/\s+Reverse\s*$/i, '')
    .trim();

  return {
    name,
    number: numberMatch?.[1] || hashNumberMatch?.[1] || undefined
  };
}

// Calculate similarity between two strings (Levenshtein-based)
function stringSimilarity(str1: string, str2: string): number {
  const s1 = str1.toLowerCase();
  const s2 = str2.toLowerCase();
  
  if (s1 === s2) return 1;
  if (s1.length === 0 || s2.length === 0) return 0;
  
  // Check if one contains the other
  if (s1.includes(s2) || s2.includes(s1)) {
    return 0.9;
  }
  
  // Simple word overlap
  const words1 = new Set(s1.split(/\s+/));
  const words2 = new Set(s2.split(/\s+/));
  const intersection = [...words1].filter(w => words2.has(w));
  const union = new Set([...words1, ...words2]);
  
  return intersection.length / union.size;
}

async function findCardMatches(
  supabase: any,
  extractedInfo: { name: string; set?: string; number?: string },
  limit = 5
): Promise<MatchResult[]> {
  const results: MatchResult[] = [];
  
  // Search by name similarity using PostgreSQL full-text search
  const { data: nameMatches } = await supabase
    .from('pokemon_card_attributes')
    .select('card_id, name, set_name, set_code, number, images')
    .textSearch('name', extractedInfo.name.split(' ').join(' & '), {
      type: 'websearch'
    })
    .limit(20);

  // Also try ilike search as fallback
  const { data: ilikeMatches } = await supabase
    .from('pokemon_card_attributes')
    .select('card_id, name, set_name, set_code, number, images')
    .ilike('name', `%${extractedInfo.name.split(' ')[0]}%`)
    .limit(20);

  const allMatches = [...(nameMatches || []), ...(ilikeMatches || [])];
  const seen = new Set<string>();

  for (const card of allMatches) {
    if (seen.has(card.card_id)) continue;
    seen.add(card.card_id);

    const matchedBy: string[] = [];
    let confidence = 0;

    // Name similarity
    const nameSim = stringSimilarity(extractedInfo.name, card.name);
    if (nameSim > 0.5) {
      matchedBy.push('name');
      confidence += nameSim * 50;
    }

    // Number match
    if (extractedInfo.number && card.number) {
      const listingNum = extractedInfo.number.replace(/^0+/, '');
      const cardNum = card.number.replace(/^0+/, '');
      if (listingNum === cardNum) {
        matchedBy.push('number');
        confidence += 30;
      }
    }

    // Set match (if mentioned in title)
    if (extractedInfo.set && card.set_name) {
      const setSim = stringSimilarity(extractedInfo.set, card.set_name);
      if (setSim > 0.5) {
        matchedBy.push('set');
        confidence += setSim * 20;
      }
    }

    if (matchedBy.length > 0 && confidence > 30) {
      results.push({
        card_id: card.card_id,
        name: card.name,
        set_name: card.set_name,
        confidence: Math.min(100, Math.round(confidence)),
        matched_by: matchedBy
      });
    }
  }

  // Sort by confidence and return top matches
  return results
    .sort((a, b) => b.confidence - a.confidence)
    .slice(0, limit);
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return handleCORS();
  }

  try {
    // Require admin authentication
    await requireAdmin(req);

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const {
      listingId = null,  // Process single listing
      limit = 50,        // Batch size for processing unlinked listings
      autoLinkThreshold = 90,  // Auto-link if confidence >= this
      dryRun = false     // If true, don't actually update, just report
    } = await req.json().catch(() => ({}));

    console.log('🔗 Starting listing-to-card matching...');
    console.log(`   Auto-link threshold: ${autoLinkThreshold}%`);
    console.log(`   Dry run: ${dryRun}`);

    let listings;

    if (listingId) {
      // Process single listing
      const { data } = await supabase
        .from('listings')
        .select('id, title, description, card_id')
        .eq('id', listingId)
        .single();
      listings = data ? [data] : [];
    } else {
      // Process unlinked listings
      const { data } = await supabase
        .from('listings')
        .select('id, title, description, card_id')
        .is('card_id', null)
        .limit(limit);
      listings = data || [];
    }

    console.log(`📊 Processing ${listings.length} listings`);

    const results = {
      processed: 0,
      autoLinked: 0,
      needsReview: 0,
      noMatch: 0,
      matches: [] as Array<{
        listing_id: string;
        title: string;
        top_match: MatchResult | null;
        action: string;
      }>
    };

    for (const listing of listings) {
      results.processed++;

      // Extract card info from title
      const extractedInfo = extractCardInfo(listing.title);
      console.log(`\n🔍 Processing: "${listing.title}"`);
      console.log(`   Extracted: name="${extractedInfo.name}", number="${extractedInfo.number}"`);

      // Find matching cards
      const matches = await findCardMatches(supabase, extractedInfo);

      if (matches.length === 0) {
        console.log(`   ❌ No matches found`);
        results.noMatch++;
        results.matches.push({
          listing_id: listing.id,
          title: listing.title,
          top_match: null,
          action: 'no_match'
        });
        continue;
      }

      const topMatch = matches[0];
      console.log(`   ✅ Top match: ${topMatch.name} (${topMatch.confidence}% confidence)`);

      let action = 'needs_review';

      if (topMatch.confidence >= autoLinkThreshold) {
        // Auto-link
        if (!dryRun) {
          const { error } = await supabase
            .from('listings')
            .update({ card_id: topMatch.card_id })
            .eq('id', listing.id);

          if (error) {
            console.error(`   ❌ Failed to link: ${error.message}`);
          } else {
            console.log(`   🔗 Auto-linked to ${topMatch.card_id}`);
          }
        }
        action = 'auto_linked';
        results.autoLinked++;
      } else {
        results.needsReview++;
      }

      results.matches.push({
        listing_id: listing.id,
        title: listing.title,
        top_match: topMatch,
        action
      });
    }

    console.log(`\n🎉 Matching complete!`);
    console.log(`📊 Stats:`);
    console.log(`   Processed: ${results.processed}`);
    console.log(`   Auto-linked: ${results.autoLinked}`);
    console.log(`   Needs review: ${results.needsReview}`);
    console.log(`   No match: ${results.noMatch}`);

    return new Response(
      JSON.stringify({
        success: true,
        dryRun,
        autoLinkThreshold,
        stats: {
          processed: results.processed,
          autoLinked: results.autoLinked,
          needsReview: results.needsReview,
          noMatch: results.noMatch
        },
        matches: results.matches.slice(0, 50) // Return first 50 for review
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('❌ Matching error:', error);
    
    // Handle authentication errors
    if (error instanceof Error && (error.message === 'Unauthorized' || error.message === 'Forbidden')) {
      return createErrorResponse(error);
    }
    
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Unknown error'
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
