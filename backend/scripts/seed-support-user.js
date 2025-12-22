#!/usr/bin/env node
/**
 * Seed Support User Script
 *
 * Seeds the default support user (zcarss@gmail.com) with support access.
 * Run this after initial database setup.
 *
 * Usage:
 *   node scripts/seed-support-user.js
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const DEFAULT_SUPPORT_USER = 'zcarss@gmail.com';

async function main() {
  console.log('\n🔧 Seeding default support user...\n');

  try {
    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { email: DEFAULT_SUPPORT_USER.toLowerCase() },
    });

    if (!user) {
      console.log(`❌ User ${DEFAULT_SUPPORT_USER} not found in database.`);
      console.log('   The user must log in at least once before being granted support access.');
      console.log('');
      console.log('   Steps:');
      console.log('   1. Have the user log in to the web app');
      console.log('   2. Run this script again');
      console.log('');
      process.exit(1);
    }

    // Calculate a date 100 years in the future for permanent subscription
    const farFutureDate = new Date();
    farFutureDate.setFullYear(farFutureDate.getFullYear() + 100);

    // Update user with support access and permanent subscription
    await prisma.user.update({
      where: { email: DEFAULT_SUPPORT_USER.toLowerCase() },
      data: {
        isSupportUser: true,
        isSubscribed: true,
        subscriptionEndDate: farFutureDate,
        renewalDate: farFutureDate,
      },
    });

    if (user.isSupportUser) {
      console.log(`✅ ${DEFAULT_SUPPORT_USER} was already a support user - refreshed subscription data.`);
    } else {
      console.log(`✅ Granted support access to: ${DEFAULT_SUPPORT_USER}`);
    }

    console.log('\n✅ Support user setup complete!\n');
  } catch (error) {
    console.error('❌ Error seeding support user:', error.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
