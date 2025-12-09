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

    if (user.isSupportUser) {
      console.log(`✅ ${DEFAULT_SUPPORT_USER} is already a support user.`);
    } else {
      await prisma.user.update({
        where: { email: DEFAULT_SUPPORT_USER.toLowerCase() },
        data: { isSupportUser: true },
      });
      console.log(`✅ Granted support access to: ${DEFAULT_SUPPORT_USER}`);
    }

    // Also grant subscription if not already subscribed
    if (!user.isSubscribed) {
      const INDEFINITE_DATE = new Date();
      INDEFINITE_DATE.setFullYear(INDEFINITE_DATE.getFullYear() + 100);

      await prisma.user.update({
        where: { email: DEFAULT_SUPPORT_USER.toLowerCase() },
        data: {
          isSubscribed: true,
          subscriptionId: 'SUPPORT_GRANTED',
          subscriptionStartDate: new Date(),
          subscriptionEndDate: INDEFINITE_DATE,
          storageLimitGb: 100,
        },
      });
      console.log(`✅ Granted subscription access to: ${DEFAULT_SUPPORT_USER}`);
    } else {
      console.log(`✅ ${DEFAULT_SUPPORT_USER} already has subscription access.`);
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
