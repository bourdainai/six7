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
    const { messages } = await req.json();
    
    console.log('Analyzing sentiment for messages:', messages.length);

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) throw new Error('LOVABLE_API_KEY not configured');

    const systemPrompt = `You are a conversation sentiment analyzer. Analyze the tone and sentiment of buyer-seller conversations to help both parties communicate effectively. Detect:
1. Overall conversation sentiment (positive, neutral, negative, frustrated)
2. Buyer interest level (high, medium, low)
3. Seller responsiveness quality
4. Potential deal likelihood
5. Communication red flags`;

    const conversationText = messages
      .map((m: { role: string; content: string }) => `${m.role}: ${m.content}`)
      .join('\n');

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
          { role: 'user', content: `Analyze this conversation:\n${conversationText}` }
        ],
        tools: [{
          type: 'function',
          function: {
            name: 'sentiment_analysis',
            description: 'Analyze conversation sentiment',
            parameters: {
              type: 'object',
              properties: {
                overall_sentiment: {
                  type: 'string',
                  enum: ['very_positive', 'positive', 'neutral', 'negative', 'frustrated']
                },
                buyer_interest: {
                  type: 'string',
                  enum: ['high', 'medium', 'low']
                },
                deal_likelihood: {
                  type: 'number',
                  minimum: 0,
                  maximum: 100
                },
                insights: {
                  type: 'array',
                  items: { type: 'string' }
                },
                recommendations: {
                  type: 'array',
                  items: { type: 'string' }
                }
              },
              required: ['overall_sentiment', 'buyer_interest', 'deal_likelihood', 'insights', 'recommendations']
            }
          }
        }],
        tool_choice: { type: 'function', function: { name: 'sentiment_analysis' } }
      })
    });

    if (!aiResponse.ok) {
      throw new Error(`AI API error: ${aiResponse.status}`);
    }

    const result = await aiResponse.json();
    const toolCall = result.choices[0].message.tool_calls[0];
    const analysis = JSON.parse(toolCall.function.arguments);

    console.log('Sentiment analysis:', analysis);

    return new Response(JSON.stringify(analysis), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in message-sentiment-analyzer:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
