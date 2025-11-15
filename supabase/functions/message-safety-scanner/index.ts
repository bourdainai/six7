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
    const { message } = await req.json();
    
    console.log('Scanning message for safety:', message);

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) throw new Error('LOVABLE_API_KEY not configured');

    const systemPrompt = `You are a content safety moderator. Analyze messages for:
1. Prohibited content (scams, fraud, harassment, personal info sharing)
2. Off-platform transaction attempts
3. Inappropriate language or behavior
4. Pressure tactics or manipulation
Return risk level and specific concerns found.`;

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
          { role: 'user', content: `Analyze this message:\n"${message}"` }
        ],
        tools: [{
          type: 'function',
          function: {
            name: 'safety_analysis',
            description: 'Analyze message safety',
            parameters: {
              type: 'object',
              properties: {
                risk_level: { 
                  type: 'string', 
                  enum: ['safe', 'low', 'medium', 'high', 'critical'] 
                },
                concerns: {
                  type: 'array',
                  items: { type: 'string' }
                },
                reasoning: { type: 'string' },
                action_recommended: { 
                  type: 'string',
                  enum: ['allow', 'warn', 'block', 'review']
                }
              },
              required: ['risk_level', 'concerns', 'reasoning', 'action_recommended']
            }
          }
        }],
        tool_choice: { type: 'function', function: { name: 'safety_analysis' } }
      })
    });

    if (!aiResponse.ok) {
      throw new Error(`AI API error: ${aiResponse.status}`);
    }

    const result = await aiResponse.json();
    const toolCall = result.choices[0].message.tool_calls[0];
    const analysis = JSON.parse(toolCall.function.arguments);

    console.log('Safety analysis:', analysis);

    return new Response(JSON.stringify(analysis), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in message-safety-scanner:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
