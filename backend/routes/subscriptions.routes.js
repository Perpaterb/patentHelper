/**
 * Subscriptions Routes
 *
 * Routes for subscription status queries.
 * Note: Actual subscription management is handled in web-admin app only.
 *
 * @module routes/subscriptions
 */

const express = require('express');
const router = express.Router();
const subscriptionsController = require('../controllers/subscriptions.controller');
const { requireAuth } = require('../middleware/auth.middleware');

/**
 * GET /subscriptions/status
 * Get current user's subscription status
 *
 * Requires valid access token in Authorization header
 *
 * Headers:
 * - Authorization: Bearer <access_token>
 *
 * Response:
 * - 200: Subscription status
 *   {
 *     success: true,
 *     subscription: {
 *       isActive: boolean,
 *       email: string
 *     }
 *   }
 * - 401: Invalid or missing token
 * - 404: User not found
 * - 500: Server error
 */
router.get('/status', requireAuth, subscriptionsController.getSubscriptionStatus);

/**
 * GET /subscriptions/pricing
 * Get available subscription pricing plans
 *
 * Public endpoint - no authentication required
 *
 * Response:
 * - 200: Pricing plans
 *   {
 *     success: true,
 *     pricing: [
 *       {
 *         id: string,
 *         name: string,
 *         price: number,
 *         interval: string,
 *         features: string[]
 *       }
 *     ]
 *   }
 * - 500: Server error
 */
router.get('/pricing', subscriptionsController.getPricing);

/**
 * GET /subscriptions/current
 * Get current user's detailed subscription information
 *
 * Requires valid access token in Authorization header
 *
 * Headers:
 * - Authorization: Bearer <access_token>
 *
 * Response:
 * - 200: Current subscription details
 *   {
 *     success: true,
 *     subscription: {
 *       isActive: boolean,
 *       plan: string,
 *       price?: number,
 *       interval?: string,
 *       status: string,
 *       daysRemaining?: number,
 *       currentPeriodEnd?: string,
 *       cancelAtPeriodEnd?: boolean
 *     }
 *   }
 * - 401: Invalid or missing token
 * - 404: User not found
 * - 500: Server error
 */
router.get('/current', requireAuth, subscriptionsController.getCurrentSubscription);

/**
 * POST /subscriptions/cancel
 * Cancel subscription at end of billing period
 *
 * Requires valid access token in Authorization header
 *
 * Headers:
 * - Authorization: Bearer <access_token>
 *
 * Response:
 * - 200: Subscription canceled
 *   {
 *     success: true,
 *     message: 'Subscription will be canceled at end of billing period',
 *     cancelAt: ISO8601 timestamp
 *   }
 * - 400: No active subscription
 * - 401: Invalid or missing token
 * - 404: User not found
 * - 500: Server error
 */
router.post('/cancel', requireAuth, subscriptionsController.cancelSubscription);

/**
 * POST /subscriptions/reactivate
 * Reactivate a canceled subscription
 *
 * Requires valid access token in Authorization header
 *
 * Headers:
 * - Authorization: Bearer <access_token>
 *
 * Response:
 * - 200: Subscription reactivated
 *   {
 *     success: true,
 *     message: 'Subscription reactivated successfully'
 *   }
 * - 400: Cannot reactivate (not scheduled for cancellation)
 * - 401: Invalid or missing token
 * - 404: User not found
 * - 500: Server error
 */
router.post('/reactivate', requireAuth, subscriptionsController.reactivateSubscription);

module.exports = router;
