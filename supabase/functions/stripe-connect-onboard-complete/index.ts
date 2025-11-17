import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) {
      throw new Error('Not authenticated');
    }

    const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', {
      apiVersion: '2023-10-16',
    });

    const { accountId, formData } = await req.json();

    if (!accountId || !formData) {
      throw new Error('Missing accountId or formData');
    }

    // Verify the account belongs to this user
    const { data: profile } = await supabaseClient
      .from('profiles')
      .select('stripe_connect_account_id')
      .eq('id', user.id)
      .single();

    if (profile?.stripe_connect_account_id !== accountId) {
      throw new Error('Account ID mismatch');
    }

    // Parse date of birth with error handling
    const dateParts = formData.dateOfBirth.split('-');
    if (dateParts.length !== 3) {
      throw new Error('Invalid date of birth format');
    }
    
    const year = parseInt(dateParts[0]);
    const month = parseInt(dateParts[1]);
    const day = parseInt(dateParts[2]);
    
    if (isNaN(year) || isNaN(month) || isNaN(day)) {
      throw new Error('Invalid date of birth values');
    }
    
    // Validate date range
    if (year < 1900 || year > new Date().getFullYear() || month < 1 || month > 12 || day < 1 || day > 31) {
      throw new Error('Date of birth is out of valid range');
    }

    // Prepare account update data
    const accountUpdateData: Stripe.AccountUpdateParams = {
      business_type: formData.businessType === 'company' ? 'company' : 'individual',
      individual: {
        first_name: formData.firstName,
        last_name: formData.lastName,
        dob: {
          day: day,
          month: month,
          year: year,
        },
        address: {
          line1: formData.addressLine1,
          line2: formData.addressLine2 || undefined,
          city: formData.city,
          state: formData.state,
          postal_code: formData.postalCode,
          country: formData.country,
        },
        phone: formData.phone,
      },
    };

    // Add SSN last 4 if provided
    if (formData.ssnLast4) {
      accountUpdateData.individual!.ssn_last_4 = formData.ssnLast4;
    }

    // Add personal ID if provided
    if (formData.personalIdNumber) {
      accountUpdateData.individual!.id_number = formData.personalIdNumber;
    }

    // Add business information if company
    if (formData.businessType === 'company') {
      accountUpdateData.company = {
        name: formData.businessName,
        tax_id: formData.businessTaxId || undefined,
        structure: formData.businessTypeCategory || undefined,
      };
    }

    // Update the Stripe account
    const account = await stripe.accounts.update(accountId, accountUpdateData);

    console.log(`Updated Stripe account: ${accountId} for user: ${user.id}`);

    // Attach external account (bank account) directly to the Connect account
    const externalAccount = await stripe.accounts.createExternalAccount(accountId, {
      bank_account: {
        country: formData.country,
        currency: formData.country === 'GB' ? 'gbp' : 'usd',
        account_number: formData.accountNumber,
        routing_number: formData.routingNumber,
        account_holder_name: formData.accountHolderName,
        account_holder_type: formData.businessType === 'company' ? 'company' : 'individual',
      },
      default_for_currency: true,
    });

    console.log(`Created external account for account: ${accountId}`);

    // Check account requirements
    const accountWithRequirements = await stripe.accounts.retrieve(accountId, {
      expand: ['requirements'],
    });

    const requiresVerification = 
      accountWithRequirements.requirements?.currently_due?.length > 0 ||
      accountWithRequirements.requirements?.eventually_due?.length > 0;

    // Update profile with onboarding status
    // Note: We set onboarding_complete to true, but Stripe will verify via webhook
    // The webhook will update can_receive_payments when charges_enabled is true
    await supabaseClient
      .from('profiles')
      .update({ 
        stripe_onboarding_complete: !requiresVerification,
      })
      .eq('id', user.id);

    return new Response(
      JSON.stringify({ 
        success: true,
        requiresVerification: requiresVerification,
        accountId: accountId,
        requirements: {
          currently_due: accountWithRequirements.requirements?.currently_due || [],
          eventually_due: accountWithRequirements.requirements?.eventually_due || [],
        },
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in stripe-connect-onboard-complete:', error);
    return new Response(
      JSON.stringify({ 
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error' 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

