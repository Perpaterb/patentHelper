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
  const { prisma } = require('../config/database');
  const userId = session.client_reference_id || session.metadata.userId;

  console.log(`[Webhook] Checkout completed for user ${userId}`);

  try {
    // Update user with Stripe customer ID
    await prisma.user.update({
      where: { userId: userId },
      data: {
        isSubscribed: true,
        subscriptionStartDate: new Date(),
        storageLimitGb: 10, // Base subscription includes 10GB
      },
    });

    console.log(`✅ User ${userId} subscription activated (checkout complete)`);
  } catch (error) {
    console.error(`❌ Failed to update user subscription:`, error);
    throw error;
  }
}

/**
 * Handle subscription update
 * @param {Object} subscription - Stripe subscription object
 */
async function handleSubscriptionUpdate(subscription) {
  const { prisma } = require('../config/database');
  const customerId = subscription.customer;

  console.log(`[Webhook] Subscription updated for customer ${customerId}`);

  try {
    // Find user by subscription ID
    const user = await prisma.user.findFirst({
      where: { subscriptionId: subscription.id },
    });

    if (!user) {
      console.log(`⚠️ User not found for subscription ${subscription.id}`);
      return;
    }

    // Update subscription details
    await prisma.user.update({
      where: { userId: user.userId },
      data: {
        subscriptionId: subscription.id,
        isSubscribed: subscription.status === 'active',
        subscriptionEndDate: subscription.cancel_at
          ? new Date(subscription.cancel_at * 1000)
          : null,
      },
    });

    console.log(`✅ User ${user.userId} subscription updated`);
  } catch (error) {
    console.error(`❌ Failed to update subscription:`, error);
    throw error;
  }
}

/**
 * Handle subscription cancellation
 * @param {Object} subscription - Stripe subscription object
 */
async function handleSubscriptionCanceled(subscription) {
  const { prisma } = require('../config/database');
  const customerId = subscription.customer;

  console.log(`[Webhook] Subscription canceled for customer ${customerId}`);

  try {
    // Find user by subscription ID
    const user = await prisma.user.findFirst({
      where: { subscriptionId: subscription.id },
    });

    if (!user) {
      console.log(`⚠️ User not found for subscription ${subscription.id}`);
      return;
    }

    // Mark subscription as canceled
    await prisma.user.update({
      where: { userId: user.userId },
      data: {
        isSubscribed: false,
        subscriptionEndDate: new Date(),
      },
    });

    console.log(`✅ User ${user.userId} subscription canceled`);
  } catch (error) {
    console.error(`❌ Failed to cancel subscription:`, error);
    throw error;
  }
}

/**
 * Get current subscription status
 * GET /subscriptions/current
 *
 * @param {Object} req - Express request
 * @param {Object} res - Express response
 */
async function getCurrentSubscription(req, res) {
  try {
    const { prisma } = require('../config/database');
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'User not authenticated',
      });
    }

    // Get user with subscription details
    const user = await prisma.user.findUnique({
      where: { userId: userId },
      select: {
        userId: true,
        email: true,
        isSubscribed: true,
        subscriptionId: true,
        subscriptionStartDate: true,
        subscriptionEndDate: true,
        storageLimitGb: true,
        storageUsedBytes: true,
        createdAt: true,
      },
    });

    if (!user) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'User not found',
      });
    }

    // If user has a Stripe subscription, get details from Stripe
    let stripeSubscription = null;
    if (user.subscriptionId) {
      try {
        stripeSubscription = await stripe.subscriptions.retrieve(user.subscriptionId);
      } catch (error) {
        console.error('[Get Subscription] Failed to retrieve Stripe subscription:', error.message);
        // Continue without Stripe details - user may have subscribed but Stripe ID not synced
      }
    }

    // Convert BigInt to Number for JSON serialization and calculations
    const storageUsedBytes = Number(user.storageUsedBytes);
    const storageLimitBytes = user.storageLimitGb * 1024 * 1024 * 1024;

    res.status(200).json({
      success: true,
      subscription: {
        isSubscribed: user.isSubscribed,
        subscriptionId: user.subscriptionId,
        startDate: user.subscriptionStartDate,
        endDate: user.subscriptionEndDate,
        createdAt: user.createdAt,
        storageLimitGb: user.storageLimitGb,
        storageUsedBytes: storageUsedBytes,
        storageUsedGb: (storageUsedBytes / (1024 * 1024 * 1024)).toFixed(2),
        storageUsedPercentage: user.storageLimitGb > 0
          ? ((storageUsedBytes / storageLimitBytes) * 100).toFixed(1)
          : 0,
        stripe: stripeSubscription ? {
          status: stripeSubscription.status,
          currentPeriodEnd: new Date(stripeSubscription.current_period_end * 1000),
          cancelAtPeriodEnd: stripeSubscription.cancel_at_period_end,
        } : null,
      },
    });
  } catch (error) {
    console.error('Get current subscription error:', error);
    res.status(500).json({
      error: 'Failed to get subscription',
      message: error.message,
    });
  }
}

/**
 * Cancel subscription
 * POST /subscriptions/cancel
 *
 * @param {Object} req - Express request
 * @param {Object} res - Express response
 */
async function cancelSubscription(req, res) {
  try {
    const { prisma } = require('../config/database');
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'User not authenticated',
      });
    }

    // Get user with subscription ID
    const user = await prisma.user.findUnique({
      where: { userId: userId },
      select: {
        userId: true,
        email: true,
        subscriptionId: true,
        subscriptionStartDate: true,
      },
    });

    if (!user || !user.subscriptionId) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'No active subscription found',
      });
    }

    // Check if this is a test/local subscription
    const isTestSubscription = user.subscriptionId.startsWith('sub_test_');

    let cancelAt;

    if (isTestSubscription) {
      // For local development: Cancel test subscription without calling Stripe
      console.log(`[Local] Canceling test subscription ${user.subscriptionId}`);

      // Calculate end date (30 days from start for test subscriptions)
      const startDate = user.subscriptionStartDate || new Date();
      cancelAt = new Date(startDate);
      cancelAt.setDate(cancelAt.getDate() + 30); // 30 days billing period

      // Update database
      await prisma.user.update({
        where: { userId: userId },
        data: {
          subscriptionEndDate: cancelAt,
        },
      });
    } else {
      // Production: Cancel subscription in Stripe (at period end)
      const subscription = await stripe.subscriptions.update(user.subscriptionId, {
        cancel_at_period_end: true,
      });

      cancelAt = new Date(subscription.current_period_end * 1000);

      // Update database
      await prisma.user.update({
        where: { userId: userId },
        data: {
          subscriptionEndDate: cancelAt,
        },
      });
    }

    res.status(200).json({
      success: true,
      message: 'Subscription canceled successfully',
      cancelAt: cancelAt,
    });
  } catch (error) {
    console.error('Cancel subscription error:', error);
    res.status(500).json({
      error: 'Failed to cancel subscription',
      message: error.message,
    });
  }
}

/**
 * Reactivate canceled subscription
 * POST /subscriptions/reactivate
 *
 * @param {Object} req - Express request
 * @param {Object} res - Express response
 */
async function reactivateSubscription(req, res) {
  try {
    const { prisma } = require('../config/database');
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'User not authenticated',
      });
    }

    // Get user with subscription ID
    const user = await prisma.user.findUnique({
      where: { userId: userId },
      select: {
        userId: true,
        email: true,
        subscriptionId: true,
        subscriptionEndDate: true,
      },
    });

    if (!user || !user.subscriptionId) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'No subscription found',
      });
    }

    if (!user.subscriptionEndDate) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Subscription is not canceled',
      });
    }

    // Check if subscription has already ended
    if (new Date(user.subscriptionEndDate) < new Date()) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Subscription has already ended. Please subscribe again.',
      });
    }

    // Check if this is a test/local subscription
    const isTestSubscription = user.subscriptionId.startsWith('sub_test_');

    if (isTestSubscription) {
      // For local development: Reactivate test subscription without calling Stripe
      console.log(`[Local] Reactivating test subscription ${user.subscriptionId}`);

      // Remove end date
      await prisma.user.update({
        where: { userId: userId },
        data: {
          subscriptionEndDate: null,
        },
      });
    } else {
      // Production: Reactivate subscription in Stripe
      await stripe.subscriptions.update(user.subscriptionId, {
        cancel_at_period_end: false,
      });

      // Update database
      await prisma.user.update({
        where: { userId: userId },
        data: {
          subscriptionEndDate: null,
        },
      });
    }

    res.status(200).json({
      success: true,
      message: 'Subscription reactivated successfully',
    });
  } catch (error) {
    console.error('Reactivate subscription error:', error);
    res.status(500).json({
      error: 'Failed to reactivate subscription',
      message: error.message,
    });
  }
}

module.exports = {
  createCheckoutSession,
  getPricing,
  handleWebhook,
  getCurrentSubscription,
  cancelSubscription,
  reactivateSubscription,
};
