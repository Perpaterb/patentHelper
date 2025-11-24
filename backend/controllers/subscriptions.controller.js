/**
 * Subscriptions Controller
 *
 * Handles subscription status queries for mobile/web apps.
 * Note: Actual subscription management (Stripe) is handled in web-admin app only.
 *
 * @module controllers/subscriptions
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/**
 * Get current user's subscription status
 * GET /subscriptions/status
 *
 * Returns whether the user has an active subscription
 *
 * @param {Object} req - Express request (with user attached by requireAuth middleware)
 * @param {Object} res - Express response
 */
async function getSubscriptionStatus(req, res) {
  try {
    // Get user from database to ensure fresh data
    const user = await prisma.user.findUnique({
      where: { userId: req.user.userId },
      select: {
        userId: true,
        email: true,
        isSubscribed: true,
      },
    });

    if (!user) {
      return res.status(404).json({
        error: 'User not found',
        message: 'User account not found',
      });
    }

    res.status(200).json({
      success: true,
      subscription: {
        isActive: user.isSubscribed,
        email: user.email,
      },
    });
  } catch (error) {
    console.error('Get subscription status error:', error);
    res.status(500).json({
      error: 'Failed to get subscription status',
      message: error.message,
    });
  }
}

/**
 * Get pricing plans
 * GET /subscriptions/pricing
 *
 * Returns available subscription plans
 *
 * @param {Object} req - Express request
 * @param {Object} res - Express response
 */
async function getPricing(req, res) {
  try {
    // Pricing structure for web-admin Subscription.jsx
    // Updated: Nov 2025 - Competitive pricing model
    const pricing = {
      adminSubscription: {
        priceId: 'price_admin_subscription', // TODO: Replace with actual Stripe price ID
        name: 'Admin Subscription',
        amount: 400, // $4.00 USD in cents (was $8, now $4 - competitive pricing)
        currency: 'usd',
        interval: 'month',
        description: 'Required for group admins. Includes 10GB storage for logs, images, and videos. Only $4/month per admin.',
        features: [
          '10GB storage included',
          'Full admin features',
          '20-day free trial',
          'All group members free (only admins pay)',
        ],
      },
      additionalStorage: {
        priceId: 'price_storage_metered', // TODO: Replace with actual Stripe metered price ID
        name: 'Additional Storage',
        amount: 100, // $1.00 USD per GB in cents (metered billing)
        currency: 'usd',
        interval: 'month',
        unit: 'GB',
        description: 'Additional storage beyond the included 10GB. $1 USD per GB automatically charged.',
        billingType: 'metered', // Automatically charged based on usage
      },
    };

    res.status(200).json({
      success: true,
      pricing: pricing,
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
 * Get current user's subscription details
 * GET /subscriptions/current
 *
 * Returns detailed subscription information for the current user
 *
 * @param {Object} req - Express request (with user attached by requireAuth middleware)
 * @param {Object} res - Express response
 */
async function getCurrentSubscription(req, res) {
  try {
    // Get user from database to ensure fresh data
    const user = await prisma.user.findUnique({
      where: { userId: req.user.userId },
      select: {
        userId: true,
        email: true,
        isSubscribed: true,
        createdAt: true,
        subscriptionStartDate: true,
        subscriptionEndDate: true,
      },
    });

    if (!user) {
      return res.status(404).json({
        error: 'User not found',
        message: 'User account not found',
      });
    }

    // Calculate storage used by user (files in groups where they are admin)
    // Get all groups where user is admin
    const adminGroups = await prisma.groupMember.findMany({
      where: {
        userId: req.user.userId,
        role: 'admin',
      },
      select: {
        groupId: true,
      },
    });

    const adminGroupIds = adminGroups.map(g => g.groupId);

    // Sum all file sizes from MessageMedia in those groups
    let storageUsedBytes = BigInt(0);

    if (adminGroupIds.length > 0) {
      const mediaResult = await prisma.messageMedia.aggregate({
        where: {
          message: {
            messageGroup: {
              groupId: {
                in: adminGroupIds,
              },
            },
          },
        },
        _sum: {
          fileSizeBytes: true,
        },
      });

      storageUsedBytes = mediaResult._sum.fileSizeBytes || BigInt(0);
    }

    // Convert bytes to GB (divide by 1024^3)
    const storageUsedGb = (Number(storageUsedBytes) / (1024 * 1024 * 1024)).toFixed(2);

    // TODO: Replace with actual subscription data from Stripe
    // For now, return trial/subscription info based on isSubscribed flag
    if (user.isSubscribed) {
      // Check if subscription is scheduled for cancellation
      const hasScheduledCancellation = user.subscriptionEndDate && new Date(user.subscriptionEndDate) > new Date();
      const periodEnd = hasScheduledCancellation
        ? user.subscriptionEndDate
        : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

      res.status(200).json({
        success: true,
        subscription: {
          isActive: true,
          isSubscribed: true, // Frontend expects this field
          plan: 'Pro', // TODO: Get from Stripe
          price: 19.99,
          interval: 'month',
          status: 'active',
          currentPeriodEnd: new Date(periodEnd).toISOString(),
          cancelAtPeriodEnd: hasScheduledCancellation,
          createdAt: user.createdAt, // For frontend trial calculation
          // Frontend compatibility fields
          startDate: user.subscriptionStartDate || user.createdAt, // Fallback to account creation if not set
          endDate: hasScheduledCancellation ? user.subscriptionEndDate : null, // Only set if canceling
          storageUsedGb: storageUsedGb,
          stripe: {
            currentPeriodEnd: new Date(periodEnd).toISOString(),
          },
        },
      });
    } else {
      // Calculate trial days remaining (20 days from account creation)
      const accountAge = Date.now() - new Date(user.createdAt).getTime();
      const daysElapsed = Math.floor(accountAge / (24 * 60 * 60 * 1000));
      const daysRemaining = Math.max(0, 20 - daysElapsed);

      res.status(200).json({
        success: true,
        subscription: {
          isActive: false,
          isSubscribed: false, // Frontend expects this field
          plan: 'Free Trial',
          status: 'trial',
          daysRemaining: daysRemaining,
          trialEndsAt: new Date(new Date(user.createdAt).getTime() + 20 * 24 * 60 * 60 * 1000).toISOString(),
          createdAt: user.createdAt, // For frontend trial calculation
          storageUsedGb: storageUsedGb,
        },
      });
    }
  } catch (error) {
    console.error('Get current subscription error:', error);
    res.status(500).json({
      error: 'Failed to get current subscription',
      message: error.message,
    });
  }
}

/**
 * Cancel subscription at end of billing period
 * POST /subscriptions/cancel
 *
 * Cancels the user's subscription, but keeps access until end of current period
 *
 * @param {Object} req - Express request (with user attached by requireAuth middleware)
 * @param {Object} res - Express response
 */
async function cancelSubscription(req, res) {
  try {
    // Get user from database
    const user = await prisma.user.findUnique({
      where: { userId: req.user.userId },
      select: {
        userId: true,
        email: true,
        isSubscribed: true,
        subscriptionId: true,
        subscriptionEndDate: true,
      },
    });

    if (!user) {
      return res.status(404).json({
        error: 'User not found',
        message: 'User account not found',
      });
    }

    // Check if user has active subscription
    if (!user.isSubscribed) {
      return res.status(400).json({
        error: 'No active subscription',
        message: 'You don\'t have an active subscription to cancel',
      });
    }

    // Check if already scheduled for cancellation
    if (user.subscriptionEndDate && new Date(user.subscriptionEndDate) > new Date()) {
      return res.status(400).json({
        error: 'Already scheduled for cancellation',
        message: `Subscription is already scheduled to end on ${new Date(user.subscriptionEndDate).toLocaleDateString()}`,
      });
    }

    // TODO: Integrate with Stripe to get actual billing period end date
    // For now, set end date to 30 days from now
    const cancelAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    // Update database to set subscription end date
    await prisma.user.update({
      where: { userId: req.user.userId },
      data: {
        subscriptionEndDate: cancelAt,
      },
    });

    res.status(200).json({
      success: true,
      message: 'Subscription will be canceled at end of billing period',
      cancelAt: cancelAt.toISOString(),
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
 * Reactivate a canceled subscription
 * POST /subscriptions/reactivate
 *
 * Reactivates a subscription that was canceled but still active until period end
 *
 * @param {Object} req - Express request (with user attached by requireAuth middleware)
 * @param {Object} res - Express response
 */
async function reactivateSubscription(req, res) {
  try {
    // Get user from database
    const user = await prisma.user.findUnique({
      where: { userId: req.user.userId },
      select: {
        userId: true,
        email: true,
        isSubscribed: true,
        subscriptionId: true,
        subscriptionEndDate: true,
      },
    });

    if (!user) {
      return res.status(404).json({
        error: 'User not found',
        message: 'User account not found',
      });
    }

    // Check if user has active subscription
    if (!user.isSubscribed) {
      return res.status(400).json({
        error: 'Cannot reactivate',
        message: 'You don\'t have an active subscription',
      });
    }

    // Check if subscription is actually scheduled for cancellation
    if (!user.subscriptionEndDate || new Date(user.subscriptionEndDate) <= new Date()) {
      return res.status(400).json({
        error: 'Cannot reactivate',
        message: 'Subscription is not scheduled for cancellation',
      });
    }

    // TODO: Integrate with Stripe to reactivate subscription
    // For now, clear the subscription end date
    await prisma.user.update({
      where: { userId: req.user.userId },
      data: {
        subscriptionEndDate: null,
      },
    });

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
  getSubscriptionStatus,
  getPricing,
  getCurrentSubscription,
  cancelSubscription,
  reactivateSubscription,
};
