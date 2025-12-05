/**
 * Subscriptions Routes
 *
 * Routes for subscription management using manual billing (Option B).
 * You control when and how much to charge customers.
 *
 * @module routes/subscriptions
 */

const express = require('express');
const router = express.Router();
const subscriptionController = require('../controllers/subscription.controller');
const { requireAuth } = require('../middleware/auth.middleware');

// ============================================
// PUBLIC ENDPOINTS
// ============================================

/**
 * GET /subscriptions/pricing
 * Get subscription pricing information
 */
router.get('/pricing', subscriptionController.getPricing);

/**
 * POST /subscriptions/webhook
 * Handle Stripe webhook events
 *
 * NOTE: This endpoint uses raw body parsing (configured in server.js)
 * No authentication - Stripe signature verification instead
 */
router.post(
  '/webhook',
  express.raw({ type: 'application/json' }),
  subscriptionController.handleWebhook
);

// ============================================
// AUTHENTICATED ENDPOINTS
// ============================================

/**
 * GET /subscriptions/current
 * Get current user's subscription status
 */
router.get('/current', requireAuth, subscriptionController.getCurrentSubscription);

/**
 * GET /subscriptions/status
 * Alias for /current (backward compatibility)
 */
router.get('/status', requireAuth, subscriptionController.getCurrentSubscription);

/**
 * POST /subscriptions/setup-intent
 * Create a SetupIntent for saving payment method
 *
 * Use this to get a client secret for Stripe Elements
 * to securely collect card details.
 */
router.post('/setup-intent', requireAuth, subscriptionController.createSetupIntent);

/**
 * POST /subscriptions/save-payment-method
 * Save payment method after successful setup
 *
 * Body: { paymentMethodId: string }
 */
router.post('/save-payment-method', requireAuth, subscriptionController.savePaymentMethod);

/**
 * POST /subscriptions/subscribe
 * Start a new subscription (charges the user)
 *
 * Body: { storagePacks?: number }
 */
router.post('/subscribe', requireAuth, subscriptionController.subscribe);

/**
 * PUT /subscriptions/storage-packs
 * Update number of storage packs
 *
 * Body: { storagePacks: number }
 */
router.put('/storage-packs', requireAuth, subscriptionController.updateStoragePacks);

/**
 * POST /subscriptions/cancel
 * Cancel subscription at end of billing period
 */
router.post('/cancel', requireAuth, subscriptionController.cancelSubscription);

/**
 * POST /subscriptions/reactivate
 * Reactivate a canceled subscription
 */
router.post('/reactivate', requireAuth, subscriptionController.reactivateSubscription);

/**
 * GET /subscriptions/billing-history
 * Get billing history for current user
 *
 * Query: { limit?: number } - default 12
 */
router.get('/billing-history', requireAuth, subscriptionController.getBillingHistory);

// ============================================
// INTERNAL/SCHEDULED ENDPOINTS
// ============================================

/**
 * POST /subscriptions/process-renewals
 * Process due renewals (called by EventBridge scheduler)
 *
 * Protected by X-API-Key header (BILLING_API_KEY env var)
 */
router.post('/process-renewals', subscriptionController.processRenewals);

module.exports = router;
