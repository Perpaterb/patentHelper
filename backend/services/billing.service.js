/**
 * Billing Service
 *
 * Handles manual billing operations (Option B).
 * You control when and how much to charge customers.
 */

const { stripe } = require('../config/stripe');
const { prisma } = require('../config/database');

// Pricing configuration (in cents)
const PRICING = {
  BASE_SUBSCRIPTION: 300, // $3.00 AUD base subscription per month
  STORAGE_PACK: 100, // $1.00 AUD per additional 2GB storage pack
  CURRENCY: 'aud',
};

/**
 * Process all renewals that are due today
 * This should be called daily by a scheduled job (AWS EventBridge)
 *
 * @returns {Object} Summary of processed renewals
 */
async function processRenewals() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  console.log(`[Billing] Processing renewals for ${today.toISOString().split('T')[0]}`);

  // Find all users due for renewal
  const dueUsers = await prisma.user.findMany({
    where: {
      isSubscribed: true,
      renewalDate: {
        lte: today,
      },
      stripeCustomerId: {
        not: null,
      },
      defaultPaymentMethodId: {
        not: null,
      },
    },
  });

  console.log(`[Billing] Found ${dueUsers.length} users due for renewal`);

  const results = {
    processed: 0,
    succeeded: 0,
    failed: 0,
    errors: [],
  };

  for (const user of dueUsers) {
    try {
      await chargeUser(user);
      results.succeeded++;
    } catch (error) {
      results.failed++;
      results.errors.push({
        userId: user.userId,
        email: user.email,
        error: error.message,
      });
      console.error(`[Billing] Failed to charge user ${user.email}:`, error.message);
    }
    results.processed++;
  }

  console.log(`[Billing] Completed: ${results.succeeded} succeeded, ${results.failed} failed`);

  return results;
}

/**
 * Charge a user for their subscription
 *
 * @param {Object} user - User object from database
 * @returns {Object} Payment result
 */
async function chargeUser(user) {
  // Calculate total amount
  const baseAmount = PRICING.BASE_SUBSCRIPTION;
  const storagePackCount = user.additionalStoragePacks || 0;
  const storageAmount = storagePackCount * PRICING.STORAGE_PACK;
  const totalAmount = baseAmount + storageAmount;

  // Build description
  let description = 'Family Helper - Monthly Subscription';
  if (storagePackCount > 0) {
    description += ` + ${storagePackCount} storage pack${storagePackCount > 1 ? 's' : ''}`;
  }

  console.log(`[Billing] Charging ${user.email}: $${(totalAmount / 100).toFixed(2)} AUD`);

  // Calculate billing period
  const periodStart = user.renewalDate || new Date();
  const periodEnd = new Date(periodStart);
  periodEnd.setMonth(periodEnd.getMonth() + 1);

  // Create billing history record (pending)
  const billingRecord = await prisma.billingHistory.create({
    data: {
      userId: user.userId,
      amount: totalAmount,
      currency: PRICING.CURRENCY,
      status: 'pending',
      description: description,
      baseSubscriptionAmount: baseAmount,
      storagePacks: storagePackCount,
      storagePackAmount: PRICING.STORAGE_PACK,
      periodStart: periodStart,
      periodEnd: periodEnd,
    },
  });

  try {
    // Charge the customer via Stripe PaymentIntent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: totalAmount,
      currency: PRICING.CURRENCY,
      customer: user.stripeCustomerId,
      payment_method: user.defaultPaymentMethodId,
      off_session: true,
      confirm: true,
      description: description,
      metadata: {
        userId: user.userId,
        billingId: billingRecord.billingId,
      },
    });

    // Update billing record as succeeded
    await prisma.billingHistory.update({
      where: { billingId: billingRecord.billingId },
      data: {
        status: 'succeeded',
        stripePaymentIntentId: paymentIntent.id,
      },
    });

    // Update user: new renewal date, reset failure count
    await prisma.user.update({
      where: { userId: user.userId },
      data: {
        renewalDate: periodEnd,
        lastBillingAttempt: new Date(),
        billingFailureCount: 0,
      },
    });

    console.log(`[Billing] ✅ Successfully charged ${user.email}`);

    return {
      success: true,
      paymentIntentId: paymentIntent.id,
      amount: totalAmount,
    };
  } catch (error) {
    // Update billing record as failed
    await prisma.billingHistory.update({
      where: { billingId: billingRecord.billingId },
      data: {
        status: 'failed',
        failureReason: error.message,
      },
    });

    // Increment failure count
    const newFailureCount = (user.billingFailureCount || 0) + 1;
    await prisma.user.update({
      where: { userId: user.userId },
      data: {
        lastBillingAttempt: new Date(),
        billingFailureCount: newFailureCount,
      },
    });

    // After 3 failures, cancel subscription
    if (newFailureCount >= 3) {
      console.log(`[Billing] ⚠️ User ${user.email} has ${newFailureCount} billing failures. Canceling subscription.`);
      await cancelSubscriptionForNonPayment(user);
    }

    throw error;
  }
}

/**
 * Cancel subscription due to payment failure
 *
 * @param {Object} user - User object
 */
async function cancelSubscriptionForNonPayment(user) {
  // Calculate read-only expiration (30 days)
  const readOnlyUntil = new Date();
  readOnlyUntil.setDate(readOnlyUntil.getDate() + 30);

  // Find all groups where user is admin
  const adminMemberships = await prisma.groupMember.findMany({
    where: {
      userId: user.userId,
      role: 'admin',
    },
    include: {
      group: {
        include: {
          members: {
            where: {
              role: 'admin',
              isRegistered: true,
            },
            include: {
              user: {
                select: {
                  userId: true,
                  isSubscribed: true,
                },
              },
            },
          },
        },
      },
    },
  });

  for (const membership of adminMemberships) {
    const group = membership.group;
    const otherActiveAdmins = group.members.filter(
      (m) => m.userId !== user.userId && m.user?.isSubscribed === true
    );

    if (otherActiveAdmins.length === 0) {
      // Only admin - set group to read-only
      await prisma.group.update({
        where: { groupId: group.groupId },
        data: { readOnlyUntil: readOnlyUntil },
      });

      await prisma.auditLog.create({
        data: {
          groupId: group.groupId,
          action: 'group_read_only',
          actionLocation: 'billing',
          performedBy: membership.groupMemberId,
          performedByName: membership.displayName,
          performedByEmail: user.email,
          messageContent: `Group set to read-only due to payment failure. Expires ${readOnlyUntil.toISOString().split('T')[0]}.`,
        },
      });
    } else {
      // Joint admin - demote to adult
      await prisma.groupMember.update({
        where: { groupMemberId: membership.groupMemberId },
        data: { role: 'adult' },
      });

      await prisma.auditLog.create({
        data: {
          groupId: group.groupId,
          action: 'member_role_changed',
          actionLocation: 'billing',
          performedBy: membership.groupMemberId,
          performedByName: membership.displayName,
          performedByEmail: user.email,
          messageContent: 'Role changed from "admin" to "adult" due to payment failure.',
        },
      });
    }
  }

  // Mark subscription as ended
  await prisma.user.update({
    where: { userId: user.userId },
    data: {
      isSubscribed: false,
      subscriptionEndDate: new Date(),
    },
  });

  console.log(`[Billing] ❌ Subscription canceled for ${user.email} due to payment failure`);
}

/**
 * Create or get Stripe customer for user
 *
 * @param {string} userId - User ID
 * @returns {Object} Stripe customer
 */
async function getOrCreateStripeCustomer(userId) {
  const user = await prisma.user.findUnique({
    where: { userId },
    select: {
      userId: true,
      email: true,
      displayName: true,
      stripeCustomerId: true,
    },
  });

  if (!user) {
    throw new Error('User not found');
  }

  // Return existing customer if we have one
  if (user.stripeCustomerId) {
    try {
      const customer = await stripe.customers.retrieve(user.stripeCustomerId);
      if (!customer.deleted) {
        return customer;
      }
    } catch (error) {
      console.log(`[Billing] Stripe customer not found, creating new one`);
    }
  }

  // Create new Stripe customer
  const customer = await stripe.customers.create({
    email: user.email,
    name: user.displayName || undefined,
    metadata: {
      userId: user.userId,
    },
  });

  // Save customer ID to database
  await prisma.user.update({
    where: { userId },
    data: { stripeCustomerId: customer.id },
  });

  console.log(`[Billing] Created Stripe customer ${customer.id} for ${user.email}`);

  return customer;
}

/**
 * Create a SetupIntent to save payment method for future billing
 *
 * @param {string} userId - User ID
 * @returns {Object} SetupIntent with client secret
 */
async function createSetupIntent(userId) {
  const customer = await getOrCreateStripeCustomer(userId);

  const setupIntent = await stripe.setupIntents.create({
    customer: customer.id,
    usage: 'off_session', // Allow charging when user not present
    metadata: {
      userId: userId,
    },
  });

  return {
    clientSecret: setupIntent.client_secret,
    customerId: customer.id,
  };
}

/**
 * Save payment method after successful setup
 *
 * @param {string} userId - User ID
 * @param {string} paymentMethodId - Stripe payment method ID
 */
async function savePaymentMethod(userId, paymentMethodId) {
  const user = await prisma.user.findUnique({
    where: { userId },
    select: { stripeCustomerId: true },
  });

  if (!user?.stripeCustomerId) {
    throw new Error('User has no Stripe customer');
  }

  // Attach payment method to customer if not already
  try {
    await stripe.paymentMethods.attach(paymentMethodId, {
      customer: user.stripeCustomerId,
    });
  } catch (error) {
    // May already be attached
    if (error.code !== 'resource_already_exists') {
      throw error;
    }
  }

  // Set as default payment method
  await stripe.customers.update(user.stripeCustomerId, {
    invoice_settings: {
      default_payment_method: paymentMethodId,
    },
  });

  // Save to database
  await prisma.user.update({
    where: { userId },
    data: { defaultPaymentMethodId: paymentMethodId },
  });

  console.log(`[Billing] Saved payment method ${paymentMethodId} for user ${userId}`);
}

/**
 * Start a new subscription (first payment)
 *
 * @param {string} userId - User ID
 * @param {number} storagePacks - Number of additional storage packs (default 0)
 * @returns {Object} Subscription result
 */
async function startSubscription(userId, storagePacks = 0) {
  const user = await prisma.user.findUnique({
    where: { userId },
  });

  if (!user) {
    throw new Error('User not found');
  }

  if (!user.stripeCustomerId || !user.defaultPaymentMethodId) {
    throw new Error('User must have a saved payment method');
  }

  if (user.isSubscribed) {
    throw new Error('User already has an active subscription');
  }

  // Calculate amount
  const baseAmount = PRICING.BASE_SUBSCRIPTION;
  const storageAmount = storagePacks * PRICING.STORAGE_PACK;
  const totalAmount = baseAmount + storageAmount;

  let description = 'Family Helper - Monthly Subscription';
  if (storagePacks > 0) {
    description += ` + ${storagePacks} storage pack${storagePacks > 1 ? 's' : ''}`;
  }

  const now = new Date();
  const renewalDate = new Date(now);
  renewalDate.setMonth(renewalDate.getMonth() + 1);

  // Create billing record
  const billingRecord = await prisma.billingHistory.create({
    data: {
      userId: userId,
      amount: totalAmount,
      currency: PRICING.CURRENCY,
      status: 'pending',
      description: description,
      baseSubscriptionAmount: baseAmount,
      storagePacks: storagePacks,
      storagePackAmount: PRICING.STORAGE_PACK,
      periodStart: now,
      periodEnd: renewalDate,
    },
  });

  try {
    // Charge the customer
    const paymentIntent = await stripe.paymentIntents.create({
      amount: totalAmount,
      currency: PRICING.CURRENCY,
      customer: user.stripeCustomerId,
      payment_method: user.defaultPaymentMethodId,
      off_session: true,
      confirm: true,
      description: description,
      metadata: {
        userId: userId,
        billingId: billingRecord.billingId,
      },
    });

    // Update billing record
    await prisma.billingHistory.update({
      where: { billingId: billingRecord.billingId },
      data: {
        status: 'succeeded',
        stripePaymentIntentId: paymentIntent.id,
      },
    });

    // Calculate storage limit: base 10GB + 2GB per pack
    const storageLimitGb = 10 + storagePacks * 2;

    // Activate subscription
    await prisma.user.update({
      where: { userId },
      data: {
        isSubscribed: true,
        subscriptionStartDate: now,
        subscriptionEndDate: null,
        renewalDate: renewalDate,
        additionalStoragePacks: storagePacks,
        storageLimitGb: storageLimitGb,
        billingFailureCount: 0,
        lastBillingAttempt: now,
      },
    });

    console.log(`[Billing] ✅ Subscription started for user ${userId}`);

    return {
      success: true,
      paymentIntentId: paymentIntent.id,
      amount: totalAmount,
      renewalDate: renewalDate,
    };
  } catch (error) {
    // Update billing record as failed
    await prisma.billingHistory.update({
      where: { billingId: billingRecord.billingId },
      data: {
        status: 'failed',
        failureReason: error.message,
      },
    });

    throw error;
  }
}

/**
 * Update storage pack count (takes effect on next billing)
 *
 * @param {string} userId - User ID
 * @param {number} storagePacks - New number of storage packs
 */
async function updateStoragePacks(userId, storagePacks) {
  const user = await prisma.user.findUnique({
    where: { userId },
    select: { isSubscribed: true },
  });

  if (!user?.isSubscribed) {
    throw new Error('User must have an active subscription');
  }

  if (storagePacks < 0) {
    throw new Error('Storage packs cannot be negative');
  }

  // Calculate new storage limit
  const storageLimitGb = 10 + storagePacks * 2;

  await prisma.user.update({
    where: { userId },
    data: {
      additionalStoragePacks: storagePacks,
      storageLimitGb: storageLimitGb,
    },
  });

  console.log(`[Billing] Updated storage packs to ${storagePacks} for user ${userId}`);

  return { storagePacks, storageLimitGb };
}

/**
 * Get billing history for user
 *
 * @param {string} userId - User ID
 * @param {number} limit - Max records to return
 * @returns {Array} Billing history records
 */
async function getBillingHistory(userId, limit = 12) {
  return prisma.billingHistory.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    take: limit,
  });
}

/**
 * Get pricing information
 * Returns structure matching API.md spec for web-admin/mobile apps
 */
function getPricing() {
  return {
    adminSubscription: {
      priceId: 'price_manual_billing', // Not used with manual billing
      name: 'Admin Subscription',
      amount: PRICING.BASE_SUBSCRIPTION, // 300 cents = $3.00
      currency: 'usd', // API spec uses USD for display
      interval: 'month',
      description: 'Access to admin features and 10GB storage',
    },
    additionalStorage: {
      priceId: 'price_storage_pack', // Not used with manual billing
      name: 'Additional Storage',
      amount: PRICING.STORAGE_PACK, // 100 cents = $1.00
      currency: 'usd', // API spec uses USD for display
      interval: 'month',
      unit: '10GB', // Per API spec
      description: '10GB additional storage per month',
    },
  };
}

module.exports = {
  processRenewals,
  chargeUser,
  getOrCreateStripeCustomer,
  createSetupIntent,
  savePaymentMethod,
  startSubscription,
  updateStoragePacks,
  getBillingHistory,
  getPricing,
  PRICING,
};
