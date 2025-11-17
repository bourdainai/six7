# Payout & Delivery System - Blocker Notes

**Date:** January 2025  
**Status:** ⚠️ BLOCKED - Needs debugging and testing

## What Was Implemented

### 1. Stripe Onboarding Fixes
- **File:** `supabase/functions/stripe-connect-onboard-complete/index.ts`
- **Changes:**
  - Added Terms of Service (TOS) acceptance with date and IP address
  - Added email address to individual account data
  - Set Merchant Category Code (MCC) to `5969` (Marketplace/Mail Order)
  - Added optional business website field
- **Expected:** Should reduce verification requirements on Stripe Connect accounts

### 2. Delivery Confirmation System
- **File:** `supabase/functions/mark-order-delivered/index.ts`
- **Functionality:**
  - Allows buyers to mark orders as delivered
  - Updates order status to `completed` and sets `delivered_at` timestamp
  - Automatically triggers payout processing
- **Expected:** Buyers can confirm delivery, triggering automatic payout

### 3. Automatic Payout on Delivery
- **File:** `supabase/functions/trigger-payout-on-delivery/index.ts`
- **Functionality:**
  - Processes payout when order is marked as delivered
  - Creates Stripe transfer to seller's Connect account (if needed)
  - Updates payout status to `completed`
  - Moves funds from `pending_balance` to `available_balance`
- **Expected:** Automatic fund transfer when delivery is confirmed

### 4. Orders Page UI Updates
- **File:** `src/pages/Orders.tsx`
- **Changes:**
  - Added "Mark as Delivered" button for buyers (shown when order is shipped/in transit)
  - Shows delivery confirmation with timestamp
  - Displays payout status message
  - Loading states and error handling
- **Expected:** Buyers see button to mark delivery, see confirmation after

## Known Issues / Blockers

### Potential Problems to Investigate:

1. **Stripe Onboarding Verification Requirements**
   - Still showing many requirements (TOS, email, MCC, bank account, etc.)
   - May need to check:
     - Are the fields being sent correctly to Stripe?
     - Is the account type (Express) correct?
     - Are there additional fields required by Stripe that we're missing?
     - Check Stripe dashboard for actual account status

2. **Delivery Confirmation Flow**
   - Function may not be working correctly
   - Check:
     - Is the edge function deployed correctly?
     - Are there authentication/authorization issues?
     - Is the order status update working?
     - Are there database permission issues?

3. **Payout Trigger**
   - Automatic payout may not be executing
   - Check:
     - Is the function call from `mark-order-delivered` working?
     - Are there Stripe API errors?
     - Is the transfer being created correctly?
     - Are seller accounts properly set up to receive transfers?
     - Check Stripe logs for errors

4. **Balance Updates**
   - Seller balances may not be updating correctly
   - Check:
     - Are database updates succeeding?
     - Are there RLS policy issues?
     - Is the balance calculation correct?

## Testing Checklist (When Revisiting)

- [ ] Test complete onboarding flow and check Stripe dashboard for requirements
- [ ] Test marking order as delivered as a buyer
- [ ] Verify order status updates correctly in database
- [ ] Check if payout function is being called
- [ ] Verify Stripe transfer is created
- [ ] Check seller balance updates (pending → available)
- [ ] Test error handling and edge cases
- [ ] Check Supabase function logs for errors
- [ ] Check Stripe dashboard for transfer status
- [ ] Verify all edge functions are deployed correctly

## Files to Review

1. `supabase/functions/stripe-connect-onboard-complete/index.ts`
2. `supabase/functions/mark-order-delivered/index.ts`
3. `supabase/functions/trigger-payout-on-delivery/index.ts`
4. `src/pages/Orders.tsx`
5. Database schema for `orders`, `payouts`, `seller_balances` tables
6. Stripe Connect account configuration

## Next Steps (When Revisiting)

1. **Debug Stripe Onboarding:**
   - Check actual Stripe account requirements via API
   - Compare what we're sending vs what Stripe expects
   - Review Stripe documentation for Express accounts

2. **Debug Delivery Flow:**
   - Add more logging to edge functions
   - Test function invocations manually
   - Check Supabase function logs
   - Verify database permissions

3. **Debug Payout Flow:**
   - Test Stripe transfer creation manually
   - Check if seller accounts are properly configured
   - Verify transfer_data in payment intent creation
   - Review Stripe webhook events

4. **Test End-to-End:**
   - Create test order
   - Mark as shipped
   - Mark as delivered
   - Verify payout happens
   - Check balances update

## Related Issues

- Verification Status page showing many requirements
- Payouts not processing automatically
- Delivery confirmation may not be working
- Balance updates may not be happening

## Notes

- All code has been committed and pushed to Git
- Build completes successfully
- May need to check Supabase function deployment
- May need to verify Stripe webhook configuration
- May need to check environment variables

