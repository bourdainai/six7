import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

export interface AuthenticatedUser {
  id: string;
  email?: string;
}

/**
 * Centralized admin validation middleware
 * Ensures user is authenticated and has admin role
 * @throws Error with appropriate message if unauthorized or forbidden
 */
export async function requireAdmin(req: Request): Promise<AuthenticatedUser> {
  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
  const supabase = createClient(supabaseUrl, supabaseKey);

  const authHeader = req.headers.get('Authorization');
  if (!authHeader) {
    throw new Error('Unauthorized');
  }

  const { data: { user }, error: userError } = await supabase.auth.getUser(
    authHeader.replace('Bearer ', '')
  );

  if (userError || !user) {
    throw new Error('Unauthorized');
  }

  // Check admin role in user_roles table (server-side validation)
  const { data: roles } = await supabase
    .from('user_roles')
    .select('role')
    .eq('user_id', user.id)
    .eq('role', 'admin')
    .single();

  if (!roles) {
    throw new Error('Forbidden');
  }

  return {
    id: user.id,
    email: user.email,
  };
}

/**
 * Create error response with proper CORS headers
 */
export function createErrorResponse(error: Error): Response {
  const status = error.message === 'Forbidden' ? 403 : 401;
  return new Response(
    JSON.stringify({ error: error.message }),
    { 
      status, 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    }
  );
}

/**
 * Handle OPTIONS requests for CORS
 */
export function handleCORS(): Response {
  return new Response(null, { headers: corsHeaders });
}
