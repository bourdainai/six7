import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { crypto } from "https://deno.land/std@0.168.0/crypto/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ValidateAddressRequest {
  address: string;
  address2?: string;
  city: string;
  postalCode: string;
  country: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const addressData: ValidateAddressRequest = await req.json();

    // Create hash of address for caching
    const addressString = JSON.stringify(addressData);
    const encoder = new TextEncoder();
    const data = encoder.encode(addressString);
    const hashBuffer = await crypto.subtle.digest('MD5', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const addressHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

    // Check cache
    const { data: cachedValidation } = await supabaseAdmin
      .from('address_validation_cache')
      .select('*')
      .eq('address_hash', addressHash)
      .gt('expires_at', new Date().toISOString())
      .single();

    if (cachedValidation) {
      console.log('Returning cached address validation');
      return new Response(JSON.stringify({
        isValid: cachedValidation.is_valid,
        normalizedAddress: cachedValidation.normalized_address,
        details: cachedValidation.validation_details,
        cached: true
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Basic validation
    const isValid = !!(
      addressData.address &&
      addressData.city &&
      addressData.postalCode &&
      addressData.country &&
      addressData.address.length >= 5 &&
      addressData.city.length >= 2 &&
      addressData.postalCode.length >= 3
    );

    // Additional validation rules by country
    let validationDetails: any = {
      checks: {
        hasAddress: !!addressData.address,
        hasCity: !!addressData.city,
        hasPostalCode: !!addressData.postalCode,
        hasCountry: !!addressData.country,
      }
    };

    // Normalize address
    const normalizedAddress = {
      address: addressData.address.trim(),
      address2: addressData.address2?.trim() || '',
      city: addressData.city.trim(),
      postalCode: addressData.postalCode.trim().toUpperCase(),
      country: addressData.country.toUpperCase(),
    };

    // Country-specific validation
    if (addressData.country === 'GB' || addressData.country === 'UK') {
      // UK postcode validation (basic)
      const ukPostcodeRegex = /^[A-Z]{1,2}[0-9][A-Z0-9]? ?[0-9][A-Z]{2}$/i;
      validationDetails.postcodeValid = ukPostcodeRegex.test(normalizedAddress.postalCode);
    } else if (addressData.country === 'US') {
      // US ZIP code validation
      const usZipRegex = /^\d{5}(-\d{4})?$/;
      validationDetails.postcodeValid = usZipRegex.test(normalizedAddress.postalCode);
    }

    // Cache the validation for 30 days
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);

    await supabaseAdmin
      .from('address_validation_cache')
      .upsert({
        address_hash: addressHash,
        is_valid: isValid,
        normalized_address: normalizedAddress,
        validation_details: validationDetails,
        expires_at: expiresAt.toISOString()
      });

    return new Response(JSON.stringify({
      isValid,
      normalizedAddress,
      details: validationDetails,
      cached: false
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Address validation error:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Failed to validate address',
        isValid: false
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});