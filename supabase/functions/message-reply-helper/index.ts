import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { conversationId, userRole } = await req.json();
    
    console.log('Generating reply suggestions for conversation:', conversationId);

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get conversation context
    const { data: conversation, error: convError } = await supabase
      .from('conversations')
      .select('*, listing:listings(*)')
      .eq('id', conversationId)
      .single();

    if (convError) throw convError;

    // Get recent messages
    const { data: messages, error: msgError } = await supabase
      .from('messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: false })
      .limit(10);

    if (msgError) throw msgError;

    const recentMessages = messages.reverse();
    const messageContext = recentMessages
      .map(m => `${m.sender_id === conversation.buyer_id ? 'Buyer' : 'Seller'}: ${m.content}`)
      .join('\n');

    const systemPrompt = userRole === 'seller' 
      ? `You are an AI assistant helping a seller respond to buyer inquiries about their listing: "${conversation.listing.title}". Generate 3 professional, helpful reply suggestions that address the buyer's question. Keep responses concise (1-2 sentences each). Be friendly and informative.`
      : `You are an AI assistant helping a buyer communicate with a seller about: "${conversation.listing.title}". Generate 3 polite inquiry suggestions about pricing, condition, or shipping. Keep responses concise (1-2 sentences each).`;

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) throw new Error('LOVABLE_API_KEY not configured');

    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `Recent conversation:\n${messageContext}\n\nGenerate 3 reply suggestions.` }
        ],
        tools: [{
          type: 'function',
          function: {
            name: 'suggest_replies',
            description: 'Generate reply suggestions',
            parameters: {
              type: 'object',
              properties: {
                suggestions: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      text: { type: 'string' },
                      tone: { type: 'string', enum: ['professional', 'friendly', 'informative'] }
                    },
                    required: ['text', 'tone']
                  }
                }
              },
              required: ['suggestions']
            }
          }
        }],
        tool_choice: { type: 'function', function: { name: 'suggest_replies' } }
      })
    });

    if (!aiResponse.ok) {
      throw new Error(`AI API error: ${aiResponse.status}`);
    }

    const result = await aiResponse.json();
    const toolCall = result.choices[0].message.tool_calls[0];
    const suggestions = JSON.parse(toolCall.function.arguments).suggestions;

    console.log('Generated suggestions:', suggestions);

    return new Response(JSON.stringify({ suggestions }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in message-reply-helper:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
