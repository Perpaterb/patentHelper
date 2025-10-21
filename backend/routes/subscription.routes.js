/**
 * Subscription Routes
 *
 * Routes for Stripe subscription management.
 */

const express = require('express');
const router = express.Router();
const subscriptionController = require('../controllers/subscription.controller');
const { requireAuth } = require('../middleware/auth.middleware');

/**
 * GET /subscriptions/pricing
 * Get subscription pricing information
 *
 * Response:
 * - 200: Pricing information returned
 * - 500: Server error
 */
router.get('/pricing', subscriptionController.getPricing);

/**
 * POST /subscriptions/checkout
 * Create Stripe checkout session for subscription
 *
 * Requires authentication
 *
 * Request body:
 * - priceId: Stripe price ID
 * - successUrl: URL to redirect on success
 * - cancelUrl: URL to redirect on cancel
 *
 * Response:
 * - 200: Checkout session created
 * - 400: Validation error
 * - 401: Not authenticated
 * - 500: Server error
 */
router.post('/checkout', requireAuth, subscriptionController.createCheckoutSession);

/**
 * POST /subscriptions/webhook
 * Handle Stripe webhook events
 *
 * Note: This endpoint receives raw body for signature verification
 *
 * Response:
 * - 200: Event processed
 * - 400: Invalid signature or processing error
 */
router.post('/webhook', express.raw({ type: 'application/json' }), subscriptionController.handleWebhook);

module.exports = router;
