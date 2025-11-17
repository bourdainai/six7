# Stripe Connect Setup Guide

This guide covers the setup and configuration of Stripe Connect for the 6Seven Marketplace.

## Prerequisites

- Stripe account (test mode for development, live mode for production)
- Supabase project with Edge Functions enabled
- Environment variables configured

## Environment Variables

### Required Variables

Add these to your Supabase project secrets and local `.env` file:

```bash
# Stripe API Keys
STRIPE_SECRET_KEY=sk_test_... # or sk_live_... for production
STRIPE_PUBLISHABLE_KEY=pk_test_... # or pk_live_... for production

# Stripe Webhook Secret (get from Stripe Dashboard)
STRIPE_WEBHOOK_SECRET=whsec_...

# Supabase (already configured)
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
```

### Setting Supabase Secrets

```bash
# Using Supabase CLI
supabase secrets set STRIPE_SECRET_KEY=sk_test_...
supabase secrets set STRIPE_PUBLISHABLE_KEY=pk_test_...
supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_...
```

Or via Supabase Dashboard:
1. Go to Project Settings → Edge Functions → Secrets
2. Add each secret variable

## Stripe Dashboard Configuration

### 1. Create Stripe Connect Application

1. Log in to [Stripe Dashboard](https://dashboard.stripe.com)
2. Navigate to **Settings** → **Connect** → **Settings**
3. Enable **Express accounts** (recommended for this implementation)
4. Note your **Client ID** (if using OAuth, not needed for Express)

### 2. Configure Webhook Endpoint

1. Go to **Developers** → **Webhooks**
2. Click **Add endpoint**
3. Enter your webhook URL:
   ```
   https://your-project.supabase.co/functions/v1/stripe-webhook
   ```
4. Select the following events to listen for:
   - `payment_intent.succeeded`
   - `payment_intent.payment_failed`
   - `charge.succeeded`
   - `transfer.failed`
   - `transfer.paid_failed`
   - `account.updated`
5. Click **Add endpoint**
6. **Copy the webhook signing secret** (starts with `whsec_`)
7. Add it to your environment variables as `STRIPE_WEBHOOK_SECRET`

### 3. Test Mode vs Live Mode

- **Test Mode**: Use test API keys and test webhook endpoints
- **Live Mode**: Use live API keys and live webhook endpoints
- Switch between modes in Stripe Dashboard top-right

## Database Setup

The following tables are required (already created via migrations):

- `profiles` - Extended with Stripe Connect fields
- `orders` - Order records
- `order_items` - Order line items
- `payments` - Payment records
- `payouts` - Seller payout records
- `seller_balances` - Seller balance tracking

### Required Profile Fields

```sql
ALTER TABLE profiles 
ADD COLUMN stripe_connect_account_id text,
ADD COLUMN stripe_onboarding_complete boolean DEFAULT false,
ADD COLUMN can_receive_payments boolean DEFAULT false;
```

## Edge Functions

### Required Functions

1. **stripe-connect-account-session**
   - Creates/retrieves Stripe Connect account
   - Generates account session for embedded components
   - Location: `supabase/functions/stripe-connect-account-session/`

2. **stripe-connect-onboard-complete**
   - Submits onboarding form data to Stripe
   - Creates external bank account
   - Checks verification requirements
   - Location: `supabase/functions/stripe-connect-onboard-complete/`

3. **stripe-connect-requirements**
   - Fetches current verification requirements
   - Returns account status
   - Location: `supabase/functions/stripe-connect-requirements/`

4. **stripe-webhook**
   - Handles Stripe webhook events
   - Updates payouts and balances
   - Location: `supabase/functions/stripe-webhook/`

5. **create-checkout**
   - Creates payment intents with Connect transfers
   - Location: `supabase/functions/create-checkout/`

### Deploying Functions

```bash
# Deploy all functions
supabase functions deploy stripe-connect-account-session
supabase functions deploy stripe-connect-onboard-complete
supabase functions deploy stripe-connect-requirements
supabase functions deploy stripe-webhook
supabase functions deploy create-checkout
```

## Webhook Events Handled

### payment_intent.succeeded
- Updates payment status to 'succeeded'
- Updates order status to 'paid'
- Marks listings as 'sold'
- Creates payout record
- Updates seller_balances (adds to pending)

### charge.succeeded
- Updates payout with transfer ID
- Marks payout as 'completed'
- Moves balance from pending to available

### transfer.failed / transfer.paid_failed
- Marks payout as 'failed'
- Reverts balance changes

### account.updated
- Updates onboarding completion status
- Updates can_receive_payments flag

### payment_intent.payment_failed
- Updates payment status to 'failed'

## Testing

### Test Webhook Events

Use Stripe CLI to test webhooks locally:

```bash
# Install Stripe CLI
brew install stripe/stripe-cli/stripe

# Login
stripe login

# Forward webhooks to local function
stripe listen --forward-to localhost:54321/functions/v1/stripe-webhook

# Trigger test events
stripe trigger payment_intent.succeeded
stripe trigger charge.succeeded
stripe trigger account.updated
```

### Test Onboarding Flow

1. Create a test seller account
2. Navigate to `/seller/onboarding`
3. Complete the multi-step form:
   - Business type (Individual/Company)
   - Personal information
   - Business details (if company)
   - Bank account details
   - Review and submit
4. Check verification status in `/seller/account`

### Test Payment Flow

1. Create a test listing
2. As a buyer, go to checkout
3. Use Stripe test card: `4242 4242 4242 4242`
4. Complete payment
5. Verify:
   - Order created
   - Payment record created
   - Payout record created
   - Balance updated

## Troubleshooting

### Webhook Not Receiving Events

1. Check webhook endpoint URL is correct
2. Verify webhook secret matches
3. Check Supabase function logs
4. Ensure webhook events are enabled in Stripe Dashboard

### Onboarding Errors

1. Check Stripe account creation succeeded
2. Verify bank account details format
3. Check Stripe Dashboard for account requirements
4. Review function logs for specific errors

### Payout Not Created

1. Verify `payment_intent.succeeded` webhook fired
2. Check order exists and has seller_id
3. Verify seller has completed onboarding
4. Check webhook logs for errors

### Balance Not Updating

1. Verify `charge.succeeded` webhook fired
2. Check payout record exists
3. Verify transfer ID is present
4. Check seller_balances table directly

## Security Considerations

1. **Never commit secrets** to version control
2. **Use environment variables** for all sensitive data
3. **Verify webhook signatures** (already implemented)
4. **Use RLS policies** to restrict data access
5. **Validate user authentication** in all functions
6. **Log security events** for auditing

## Production Checklist

- [ ] Switch to live Stripe API keys
- [ ] Update webhook endpoint to production URL
- [ ] Configure production webhook secret
- [ ] Test all webhook events in production
- [ ] Verify RLS policies are enabled
- [ ] Set up monitoring/alerts for webhook failures
- [ ] Document any custom business logic
- [ ] Set up backup/restore procedures

## Support Resources

- [Stripe Connect Documentation](https://stripe.com/docs/connect)
- [Stripe API Reference](https://stripe.com/docs/api)
- [Supabase Edge Functions](https://supabase.com/docs/guides/functions)
- [Stripe Webhooks Guide](https://stripe.com/docs/webhooks)

## Common Stripe Error Codes

- `invalid_account_number` - Bank account number is invalid
- `invalid_routing_number` - Routing/sort code is invalid
- `account_number_mismatch` - Account and routing don't match
- `invalid_account_holder_name` - Account holder name issue
- `requirements.currently_due` - Additional verification needed

These are handled in the onboarding flow with user-friendly error messages.

---

**Last Updated**: $(date)
**Version**: 1.0

