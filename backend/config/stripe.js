/**
 * Stripe Configuration
 *
 * Stripe client setup and configuration validation.
 */

const Stripe = require('stripe');

// Initialize Stripe with secret key
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2023-10-16', // Use latest stable API version
});

/**
 * Validate Stripe configuration
 * @returns {boolean} True if configuration is valid
 */
function validateStripeConfig() {
  if (!process.env.STRIPE_SECRET_KEY) {
    console.warn('⚠️  STRIPE_SECRET_KEY not set. Subscription features will not work.');
    return false;
  }

  if (!process.env.STRIPE_SECRET_KEY.startsWith('sk_')) {
    console.error('❌ Invalid STRIPE_SECRET_KEY format. Must start with sk_');
    return false;
  }

  const isTest = process.env.STRIPE_SECRET_KEY.startsWith('sk_test_');
  console.log(`✅ Stripe configured (${isTest ? 'TEST' : 'LIVE'} mode)`);

  return true;
}

/**
 * Stripe Price IDs from environment
 */
const PRICE_IDS = {
  ADMIN_SUBSCRIPTION: process.env.STRIPE_PRICE_ADMIN_SUBSCRIPTION || '',
  ADDITIONAL_STORAGE: process.env.STRIPE_PRICE_ADDITIONAL_STORAGE || '',
};

module.exports = {
  stripe,
  validateStripeConfig,
  PRICE_IDS,
};
