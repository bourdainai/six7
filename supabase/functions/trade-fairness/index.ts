import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { offered_value, requested_value, offered_items, requested_items } = await req.json();
    
    // Calculate raw fairness
    const ratio = offered_value / requested_value;
    let score = 0;
    
    if (ratio >= 0.95 && ratio <= 1.05) {
      score = 95 + (5 * (1 - Math.abs(1 - ratio) / 0.05)); // 95-100
    } else if (ratio >= 0.85 && ratio <= 1.15) {
      score = 80 + (15 * (1 - Math.abs(1 - ratio) / 0.15)); // 80-95
    } else if (ratio >= 0.70 && ratio <= 1.30) {
      score = 60 + (20 * (1 - Math.abs(1 - ratio) / 0.30)); // 60-80
    } else {
      score = Math.max(0, 60 * (1 - Math.abs(1 - ratio)));
    }

    const difference = offered_value - requested_value;
    const percentageDiff = ((difference / requested_value) * 100).toFixed(1);

    let label = 'Very Unbalanced';
    const suggestions = [];

    if (score >= 90) {
      label = 'Very Fair';
      suggestions.push('This is an excellent offer! Very balanced.');
    } else if (score >= 80) {
      label = 'Fair';
      suggestions.push('This is a fair trade that should be considered seriously.');
    } else if (score >= 70) {
      label = 'Slightly Unbalanced';
      if (difference < 0) {
        suggestions.push(`Consider adding £${Math.abs(difference).toFixed(2)} to balance this trade.`);
      } else {
        suggestions.push('You\'re offering slightly more than needed.');
      }
    } else if (score >= 60) {
      label = 'Unbalanced';
      if (difference < 0) {
        suggestions.push(`Add £${Math.abs(difference).toFixed(2)} or additional items to make this more appealing.`);
      }
    } else {
      label = 'Very Unbalanced';
      suggestions.push('This trade needs significant adjustment to be fair.');
    }

    return new Response(JSON.stringify({ 
      score: score / 100,
      scorePercentage: Math.round(score),
      label,
      reasoning: `Your offer is ${percentageDiff}% ${difference >= 0 ? 'above' : 'below'} the requested value.`,
      suggestions,
      details: {
        offered_value,
        requested_value,
        difference,
        ratio: ratio.toFixed(2)
      }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Fairness calculation error:', error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Unknown error',
      score: 0.5,
      label: 'Unable to calculate'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
