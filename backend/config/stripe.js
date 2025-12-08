/**
 * Stripe Configuration
 *
 * Stripe client setup and configuration validation.
 */

const Stripe = require('stripe');

// Initialize Stripe with secret key (only if valid key provided)
// For local development without Stripe, stripe will be null
let stripe = null;

const stripeKey = process.env.STRIPE_SECRET_KEY;
if (stripeKey && stripeKey.startsWith('sk_')) {
  stripe = new Stripe(stripeKey, {
    apiVersion: '2023-10-16', // Use latest stable API version
  });
}

/**
 * Validate Stripe configuration
 * @returns {boolean} True if configuration is valid
 */
function validateStripeConfig() {
  const key = process.env.STRIPE_SECRET_KEY;

  if (!key || !key.startsWith('sk_')) {
    console.warn('⚠️  Stripe not configured (no valid STRIPE_SECRET_KEY). Subscription features disabled.');
    return false;
  }

  const isTest = key.startsWith('sk_test_');
  console.log(`✅ Stripe configured (${isTest ? 'TEST' : 'LIVE'} mode)`);

  return true;
}

/**
 * Check if Stripe is available
 * @returns {boolean} True if Stripe client is initialized
 */
function isStripeAvailable() {
  return stripe !== null;
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
  isStripeAvailable,
  PRICE_IDS,
};
