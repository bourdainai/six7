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
        issues: (cachedValidation.validation_details as any)?.issues || [],
        suggestions: (cachedValidation.validation_details as any)?.suggestions,
        cached: true
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Basic validation with comprehensive checks
    const issues: string[] = [];
    
    if (!addressData.address || addressData.address.length < 5) {
      issues.push('Street address must be at least 5 characters');
    }
    if (!addressData.city || addressData.city.length < 2) {
      issues.push('City name must be at least 2 characters');
    }
    if (!addressData.postalCode || addressData.postalCode.length < 3) {
      issues.push('Postal code must be at least 3 characters');
    }
    if (!addressData.country || addressData.country.length !== 2) {
      issues.push('Country code must be 2 characters (ISO 3166-1 alpha-2)');
    }
    
    const isValid = issues.length === 0;

    // Additional validation rules by country with detailed checks
    const validationDetails: any = {
      checks: {
        hasAddress: !!addressData.address,
        hasCity: !!addressData.city,
        hasPostalCode: !!addressData.postalCode,
        hasCountry: !!addressData.country,
        streetLengthValid: addressData.address?.length >= 5,
        cityLengthValid: addressData.city?.length >= 2,
        postalCodeLengthValid: addressData.postalCode?.length >= 3,
      },
      issues: issues,
    };

    // Normalize address with smart formatting
    const normalizedAddress = {
      address: addressData.address.trim(),
      address2: addressData.address2?.trim() || '',
      city: addressData.city.trim().split(' ').map(word => 
        word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
      ).join(' '),
      postalCode: addressData.postalCode.trim().toUpperCase().replace(/\s+/g, ' '),
      country: addressData.country.toUpperCase(),
    };

    // Country-specific validation with suggestions
    const suggestions: any[] = [];
    
    if (addressData.country === 'GB' || addressData.country === 'UK') {
      // UK postcode validation (comprehensive)
      const ukPostcodeRegex = /^[A-Z]{1,2}[0-9][A-Z0-9]? ?[0-9][A-Z]{2}$/i;
      const isPostcodeValid = ukPostcodeRegex.test(normalizedAddress.postalCode);
      validationDetails.postcodeValid = isPostcodeValid;
      
      if (!isPostcodeValid) {
        issues.push('Invalid UK postcode format. Expected format: SW1A 1AA');
        // Suggest proper spacing if missing
        const withSpace = normalizedAddress.postalCode.replace(/([A-Z0-9]{3,4})([A-Z]{2})$/i, '$1 $2');
        if (withSpace !== normalizedAddress.postalCode && ukPostcodeRegex.test(withSpace)) {
          suggestions.push({
            ...normalizedAddress,
            postalCode: withSpace,
          });
        }
      }
      
      // Normalize country to GB (not UK)
      if (normalizedAddress.country === 'UK') {
        normalizedAddress.country = 'GB';
      }
    } else if (addressData.country === 'US') {
      // US ZIP code validation
      const usZipRegex = /^\d{5}(-\d{4})?$/;
      const isPostcodeValid = usZipRegex.test(normalizedAddress.postalCode);
      validationDetails.postcodeValid = isPostcodeValid;
      
      if (!isPostcodeValid) {
        issues.push('Invalid US ZIP code format. Expected: 12345 or 12345-6789');
      }
    } else if (addressData.country === 'NL') {
      // Netherlands postcode validation (1234 AB format)
      const nlPostcodeRegex = /^[1-9][0-9]{3}\s?[A-Z]{2}$/i;
      const isPostcodeValid = nlPostcodeRegex.test(normalizedAddress.postalCode);
      validationDetails.postcodeValid = isPostcodeValid;
      
      if (!isPostcodeValid) {
        issues.push('Invalid NL postcode format. Expected: 1234 AB');
        // Suggest proper spacing
        const withSpace = normalizedAddress.postalCode.replace(/^([0-9]{4})([A-Z]{2})$/i, '$1 $2');
        if (withSpace !== normalizedAddress.postalCode && nlPostcodeRegex.test(withSpace)) {
          suggestions.push({
            ...normalizedAddress,
            postalCode: withSpace,
          });
        }
      }
    } else if (['DE', 'FR', 'IT', 'ES'].includes(addressData.country)) {
      // European postcode validation (5 digits)
      const euPostcodeRegex = /^\d{5}$/;
      const isPostcodeValid = euPostcodeRegex.test(normalizedAddress.postalCode);
      validationDetails.postcodeValid = isPostcodeValid;
      
      if (!isPostcodeValid) {
        issues.push('Invalid postcode format. Expected: 5 digits');
      }
    }
    
    // Validate street address has a number
    const hasNumber = /\d/.test(addressData.address);
    validationDetails.hasStreetNumber = hasNumber;
    if (!hasNumber) {
      issues.push('Street address should include a house/building number');
    }
    
    // Update validation result
    validationDetails.issues = issues;
    const finalIsValid = issues.length === 0;

    // Cache the validation for 30 days
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);

    await supabaseAdmin
      .from('address_validation_cache')
      .upsert({
        address_hash: addressHash,
        is_valid: finalIsValid,
        normalized_address: normalizedAddress,
        validation_details: validationDetails,
        expires_at: expiresAt.toISOString()
      });

    return new Response(JSON.stringify({
      isValid: finalIsValid,
      normalizedAddress,
      details: validationDetails,
      issues: issues,
      suggestions: suggestions.length > 0 ? suggestions : undefined,
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