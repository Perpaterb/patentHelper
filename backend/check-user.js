/**
 * Quick script to check user subscription status
 */
const { prisma } = require('./config/database');

async function checkUser() {
  try {
    const users = await prisma.user.findMany({
      select: {
        userId: true,
        email: true,
        isSubscribed: true,
        subscriptionId: true,
        subscriptionStartDate: true,
        storageLimitGb: true,
      },
    });

    console.log('\n📊 Users in database:');
    console.log('==========================================');
    users.forEach(user => {
      console.log(`\nEmail: ${user.email}`);
      console.log(`User ID: ${user.userId}`);
      console.log(`Subscribed: ${user.isSubscribed}`);
      console.log(`Subscription ID: ${user.subscriptionId || 'None'}`);
      console.log(`Start Date: ${user.subscriptionStartDate || 'N/A'}`);
      console.log(`Storage Limit: ${user.storageLimitGb} GB`);
    });
    console.log('\n==========================================\n');

    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

checkUser();
