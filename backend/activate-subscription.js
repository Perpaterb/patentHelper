/**
 * Manually activate subscription for testing (simulates successful Stripe payment)
 */
const { prisma } = require('./config/database');

async function activateSubscription() {
  try {
    const user = await prisma.user.update({
      where: { email: 'zcarss@gmail.com' },
      data: {
        isSubscribed: true,
        subscriptionStartDate: new Date(),
        storageLimitGb: 10, // Base subscription includes 10GB
        subscriptionId: 'sub_test_local_development', // Fake ID for testing
      },
    });

    console.log('\n✅ Subscription activated!');
    console.log('==========================================');
    console.log(`Email: ${user.email}`);
    console.log(`Subscribed: ${user.isSubscribed}`);
    console.log(`Storage Limit: ${user.storageLimitGb} GB`);
    console.log(`Start Date: ${user.subscriptionStartDate}`);
    console.log('==========================================\n');
    console.log('🔄 Refresh your browser to see the changes!\n');

    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

activateSubscription();
