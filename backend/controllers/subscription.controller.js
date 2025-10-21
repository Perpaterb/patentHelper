/**
 * Subscription Controller
 *
 * Handles Stripe subscription operations.
 */

const { stripe, PRICE_IDS } = require('../config/stripe');

/**
 * Create Stripe checkout session for admin subscription
 * POST /subscriptions/checkout
 *
 * @param {Object} req - Express request
 * @param {Object} res - Express response
 */
async function createCheckoutSession(req, res) {
  try {
    const { priceId, successUrl, cancelUrl } = req.body;

    // Validate required fields
    if (!priceId) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'priceId is required',
      });
    }

    if (!successUrl || !cancelUrl) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'successUrl and cancelUrl are required',
      });
    }

    // Get user from auth middleware
    const userId = req.user?.userId;
    const userEmail = req.user?.email;

    if (!userId || !userEmail) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'User not authenticated',
      });
    }

    // Create Stripe checkout session
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      customer_email: userEmail,
      client_reference_id: userId, // Store user ID for webhook processing
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: {
        userId: userId,
      },
    });

    res.status(200).json({
      success: true,
      sessionId: session.id,
      url: session.url,
    });
  } catch (error) {
    console.error('Create checkout session error:', error);
    res.status(500).json({
      error: 'Checkout session creation failed',
      message: error.message,
    });
  }
}

/**
 * Get subscription pricing information
 * GET /subscriptions/pricing
 *
 * @param {Object} req - Express request
 * @param {Object} res - Express response
 */
async function getPricing(req, res) {
  try {
    const pricing = {
      adminSubscription: {
        priceId: PRICE_IDS.ADMIN_SUBSCRIPTION,
        name: 'Admin Subscription',
        description: 'Access to admin features and 10GB storage',
        amount: 800, // $8.00 in cents
        currency: 'aud',
        interval: 'month',
      },
      additionalStorage: {
        priceId: PRICE_IDS.ADDITIONAL_STORAGE,
        name: 'Additional Storage',
        description: '2GB additional storage per month',
        amount: 100, // $1.00 in cents
        currency: 'aud',
        interval: 'month',
      },
    };

    res.status(200).json({
      success: true,
      pricing,
    });
  } catch (error) {
    console.error('Get pricing error:', error);
    res.status(500).json({
      error: 'Failed to get pricing',
      message: error.message,
    });
  }
}

/**
 * Handle Stripe webhook events
 * POST /subscriptions/webhook
 *
 * @param {Object} req - Express request (raw body)
 * @param {Object} res - Express response
 */
async function handleWebhook(req, res) {
  const sig = req.headers['stripe-signature'];

  try {
    // Verify webhook signature
    const event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );

    console.log(`Webhook received: ${event.type}`);

    // Handle different event types
    switch (event.type) {
      case 'checkout.session.completed':
        const session = event.data.object;
        await handleCheckoutComplete(session);
        break;

      case 'customer.subscription.created':
      case 'customer.subscription.updated':
        const subscription = event.data.object;
        await handleSubscriptionUpdate(subscription);
        break;

      case 'customer.subscription.deleted':
        const deletedSub = event.data.object;
        await handleSubscriptionCanceled(deletedSub);
        break;

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    res.status(200).json({ received: true });
  } catch (error) {
    console.error('Webhook error:', error);
    res.status(400).json({
      error: 'Webhook handler failed',
      message: error.message,
    });
  }
}

/**
 * Handle completed checkout session
 * @param {Object} session - Stripe checkout session
 */
async function handleCheckoutComplete(session) {
  const userId = session.client_reference_id || session.metadata.userId;

  console.log(`Checkout completed for user ${userId}`);

  // TODO: Update user subscription status in database
  // This will be implemented when we add the subscriptions table
  // For now, just log the event

  // Example:
  // await prisma.user.update({
  //   where: { userId: userId },
  //   data: { isSubscribed: true, stripeCustomerId: session.customer },
  // });
}

/**
 * Handle subscription update
 * @param {Object} subscription - Stripe subscription object
 */
async function handleSubscriptionUpdate(subscription) {
  const userId = subscription.metadata.userId;

  console.log(`Subscription updated for user ${userId}`);

  // TODO: Update subscription in database
  // This will be implemented when we add the subscriptions table
}

/**
 * Handle subscription cancellation
 * @param {Object} subscription - Stripe subscription object
 */
async function handleSubscriptionCanceled(subscription) {
  const userId = subscription.metadata.userId;

  console.log(`Subscription canceled for user ${userId}`);

  // TODO: Update user subscription status in database
  // Example:
  // await prisma.user.update({
  //   where: { userId: userId },
  //   data: { isSubscribed: false },
  // });
}

module.exports = {
  createCheckoutSession,
  getPricing,
  handleWebhook,
};
