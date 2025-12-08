/**
 * Shared authentication middleware for cron/scheduled jobs and data import functions.
 * 
 * Uses the service role key as the shared secret for cron authentication.
 * This provides secure access control without requiring JWT tokens.
 * 
 * Usage:
 * ```typescript
 * import { requireCronAuth, handleCORS, createUnauthorizedResponse } from "../_shared/cron-auth.ts";
 * 
 * serve(async (req) => {
 *   if (req.method === 'OPTIONS') return handleCORS();
 *   
 *   const authResult = await requireCronAuth(req);
 *   if (!authResult.authorized) {
 *     return createUnauthorizedResponse(authResult.reason);
 *   }
 *   // ... rest of function
 * });
 * ```
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-cron-secret',
};

export interface CronAuthResult {
  authorized: boolean;
  reason?: string;
  authType?: 'cron_secret' | 'admin_jwt';
}

/**
 * Validates requests to cron/import functions.
 * Accepts:
 * 1. x-cron-secret header matching the service role key
 * 2. Valid JWT token from an admin user
 * 
 * @param req - The incoming request
 * @returns CronAuthResult indicating authorization status
 */
export async function requireCronAuth(req: Request): Promise<CronAuthResult> {
  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
  
  // Method 1: Check for cron secret header
  const cronSecret = req.headers.get('x-cron-secret');
  if (cronSecret) {
    if (cronSecret === serviceRoleKey) {
      return { authorized: true, authType: 'cron_secret' };
    }
    // Invalid cron secret
    console.warn('Invalid cron secret provided');
    return { authorized: false, reason: 'Invalid cron secret' };
  }
  
  // Method 2: Check for admin JWT
  const authHeader = req.headers.get('Authorization');
  if (authHeader && authHeader.startsWith('Bearer ')) {
    try {
      const supabase = createClient(supabaseUrl, serviceRoleKey);
      const token = authHeader.replace('Bearer ', '');
      
      const { data: { user }, error: userError } = await supabase.auth.getUser(token);
      
      if (userError || !user) {
        return { authorized: false, reason: 'Invalid or expired token' };
      }
      
      // Verify admin role
      const { data: roles } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .eq('role', 'admin')
        .single();
      
      if (roles) {
        return { authorized: true, authType: 'admin_jwt' };
      }
      
      return { authorized: false, reason: 'Admin role required' };
    } catch (error) {
      console.error('Auth check failed:', error);
      return { authorized: false, reason: 'Authentication failed' };
    }
  }
  
  // No valid authentication provided
  return { authorized: false, reason: 'Missing authentication' };
}

/**
 * Handle CORS preflight requests
 */
export function handleCORS(): Response {
  return new Response(null, { headers: corsHeaders });
}

/**
 * Create an unauthorized response with proper headers
 */
export function createUnauthorizedResponse(reason?: string): Response {
  return new Response(
    JSON.stringify({ 
      error: 'Unauthorized',
      message: reason || 'Authentication required. Provide x-cron-secret header or admin JWT.',
    }),
    { 
      status: 401, 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    }
  );
}

/**
 * Get CORS headers for use in responses
 */
export function getCorsHeaders() {
  return corsHeaders;
}
