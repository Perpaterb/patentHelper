# Stripe Setup Guide for Testing

This guide will help you configure Stripe for testing the subscription flow.

## Step 1: Get Stripe Test API Keys

1. Go to the Stripe Dashboard: https://dashboard.stripe.com/test/dashboard
2. Click on **Developers** → **API keys**
3. You'll see two keys in **Test mode**:
   - **Publishable key** (starts with `pk_test_...`)
   - **Secret key** (starts with `sk_test_...`) - click "Reveal test key"

## Step 2: Create Test Products

1. Go to **Products** in the Stripe Dashboard (Test mode)
2. Click **+ Add product**

### Product 1: Admin Subscription

- **Name**: Admin Subscription
- **Description**: Monthly subscription for admin access to Parenting Helper
- **Pricing model**: Standard pricing
- **Price**: $8.00 AUD
- **Billing period**: Monthly
- Click **Save product**
- **Copy the Price ID** (starts with `price_...`)

### Product 2: Additional Storage

- **Name**: Additional Storage
- **Description**: 2GB additional storage per month
- **Pricing model**: Standard pricing
- **Price**: $1.00 AUD
- **Billing period**: Monthly
- Click **Save product**
- **Copy the Price ID** (starts with `price_...`)

## Step 3: Update .env.local

Open `/Users/020144/Dev/patentHelper/.env.local` and update these values:

```bash
# Replace with your actual test keys:
STRIPE_PUBLISHABLE_KEY=pk_test_YOUR_ACTUAL_KEY
STRIPE_SECRET_KEY=sk_test_YOUR_ACTUAL_KEY

# Replace with your actual price IDs:
STRIPE_PRICE_ADMIN_SUBSCRIPTION=price_YOUR_ACTUAL_ADMIN_PRICE_ID
STRIPE_PRICE_ADDITIONAL_STORAGE=price_YOUR_ACTUAL_STORAGE_PRICE_ID

# Webhook secret (optional for now, needed for production)
STRIPE_WEBHOOK_SECRET=whsec_YOUR_WEBHOOK_SECRET_HERE
```

## Step 4: Update web-admin/.env

Open `/Users/020144/Dev/patentHelper/web-admin/.env` and update:

```bash
# Replace with your actual test publishable key:
REACT_APP_STRIPE_PUBLISHABLE_KEY=pk_test_YOUR_ACTUAL_KEY
```

## Step 5: Restart Servers

After updating the environment variables:

```bash
# In backend directory
cd /Users/020144/Dev/patentHelper/backend
# Stop the server (Ctrl+C) and restart:
npm run dev

# In web-admin directory (in a new terminal)
cd /Users/020144/Dev/patentHelper/web-admin
# Stop the server (Ctrl+C) and restart:
PORT=3001 npm start
```

## Step 6: Test Subscription Flow

1. Open http://localhost:3001 in your browser
2. Log in with Kinde (if not already logged in)
3. Click on **Subscription** in the navigation menu
4. You should see two pricing cards with the correct prices
5. Click **Subscribe Now** on the Admin Subscription card
6. You should be redirected to Stripe Checkout page

### Test Cards

Use these test card numbers in Stripe Checkout:

- **Success**: `4242 4242 4242 4242`
  - Use any future expiry date (e.g., 12/34)
  - Use any 3-digit CVC (e.g., 123)
  - Use any billing postal code (e.g., 12345)

- **Decline**: `4000 0000 0000 0002`
  - This will simulate a card decline

- **Requires Authentication**: `4000 0025 0000 3155`
  - This will trigger 3D Secure authentication

More test cards: https://stripe.com/docs/testing#cards

## Step 7: Verify Success

After completing a test payment:

1. You should be redirected back to http://localhost:3001/subscription?success=true
2. You should see a green success alert
3. In Stripe Dashboard → **Payments**, you should see the test payment
4. In Stripe Dashboard → **Subscriptions**, you should see the active test subscription

## Troubleshooting

### "No checkout URL received" error

- Check that `STRIPE_SECRET_KEY` is set correctly in `.env.local`
- Check that `STRIPE_PRICE_ADMIN_SUBSCRIPTION` matches your actual price ID
- Restart the backend server after updating `.env.local`

### Stripe Checkout doesn't load

- Check that you're using TEST keys (pk_test_, sk_test_)
- Verify the price ID exists in Stripe Dashboard (Test mode)
- Check browser console for errors

### Backend shows "STRIPE_SECRET_KEY not set" warning

- Make sure `.env.local` has the correct variable name: `STRIPE_SECRET_KEY` (not `STRIPE_SECRET`)
- Restart the backend server after making changes

## Next Steps

Once testing is successful:

1. Set up Stripe Webhooks for handling subscription events
2. Implement subscription status display on Account page
3. Add billing history view
4. Test subscription cancellation flow
