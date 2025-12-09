#!/usr/bin/env node
/**
 * Grant Subscription Access Script
 *
 * Grants indefinite subscription access to specified users (testers/admins).
 *
 * Usage:
 *   node scripts/grant-subscription.js <email>
 *   node scripts/grant-subscription.js <email1> <email2> ...
 *   node scripts/grant-subscription.js --list    # List all subscribed users
 *   node scripts/grant-subscription.js --revoke <email>  # Revoke subscription
 *
 * Examples:
 *   node scripts/grant-subscription.js andrew@example.com
 *   node scripts/grant-subscription.js tester1@gmail.com tester2@gmail.com
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Set subscription end date to 100 years from now (effectively indefinite)
const INDEFINITE_DATE = new Date();
INDEFINITE_DATE.setFullYear(INDEFINITE_DATE.getFullYear() + 100);

async function grantSubscription(email) {
  try {
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (!user) {
      console.log(`❌ User not found: ${email}`);
      return false;
    }

    await prisma.user.update({
      where: { email: email.toLowerCase() },
      data: {
        isSubscribed: true,
        subscriptionId: 'ADMIN_GRANTED',
        subscriptionStartDate: new Date(),
        subscriptionEndDate: INDEFINITE_DATE,
        storageLimitGb: 100, // 100GB storage for testers
      },
    });

    console.log(`✅ Granted indefinite subscription to: ${email}`);
    console.log(`   - Storage: 100GB`);
    console.log(`   - Expires: ${INDEFINITE_DATE.toLocaleDateString()}`);
    return true;
  } catch (error) {
    console.error(`❌ Error granting subscription to ${email}:`, error.message);
    return false;
  }
}

async function revokeSubscription(email) {
  try {
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (!user) {
      console.log(`❌ User not found: ${email}`);
      return false;
    }

    await prisma.user.update({
      where: { email: email.toLowerCase() },
      data: {
        isSubscribed: false,
        subscriptionId: null,
        subscriptionStartDate: null,
        subscriptionEndDate: null,
        storageLimitGb: 0,
      },
    });

    console.log(`✅ Revoked subscription from: ${email}`);
    return true;
  } catch (error) {
    console.error(`❌ Error revoking subscription from ${email}:`, error.message);
    return false;
  }
}

async function listSubscribedUsers() {
  try {
    const users = await prisma.user.findMany({
      where: { isSubscribed: true },
      select: {
        email: true,
        displayName: true,
        subscriptionId: true,
        subscriptionStartDate: true,
        subscriptionEndDate: true,
        storageLimitGb: true,
      },
      orderBy: { email: 'asc' },
    });

    if (users.length === 0) {
      console.log('No users with active subscriptions.');
      return;
    }

    console.log('\n📋 Users with active subscriptions:\n');
    console.log('-'.repeat(80));

    for (const user of users) {
      const isAdminGranted = user.subscriptionId === 'ADMIN_GRANTED';
      const endDate = user.subscriptionEndDate
        ? user.subscriptionEndDate.toLocaleDateString()
        : 'N/A';

      console.log(`  ${user.email}`);
      console.log(`    Name: ${user.displayName || 'Not set'}`);
      console.log(`    Type: ${isAdminGranted ? 'Admin Granted (Tester)' : 'Paid Subscription'}`);
      console.log(`    Storage: ${user.storageLimitGb}GB`);
      console.log(`    Expires: ${endDate}`);
      console.log('-'.repeat(80));
    }

    console.log(`\nTotal: ${users.length} subscribed user(s)\n`);
  } catch (error) {
    console.error('❌ Error listing users:', error.message);
  }
}

async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.log(`
Usage:
  node scripts/grant-subscription.js <email>           # Grant subscription
  node scripts/grant-subscription.js <email1> <email2> # Grant to multiple
  node scripts/grant-subscription.js --list            # List subscribed users
  node scripts/grant-subscription.js --revoke <email>  # Revoke subscription
    `);
    process.exit(1);
  }

  if (args[0] === '--list') {
    await listSubscribedUsers();
  } else if (args[0] === '--revoke') {
    if (args.length < 2) {
      console.log('❌ Please specify an email to revoke');
      process.exit(1);
    }
    await revokeSubscription(args[1]);
  } else {
    // Grant subscription to all provided emails
    console.log('\n🔑 Granting subscription access...\n');

    for (const email of args) {
      await grantSubscription(email);
    }
  }

  await prisma.$disconnect();
}

main().catch(async (error) => {
  console.error('Fatal error:', error);
  await prisma.$disconnect();
  process.exit(1);
});
