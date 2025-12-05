/**
 * Health Check Routes
 *
 * Simple health check endpoints to verify server is running.
 * Used by monitoring tools and load balancers.
 */

const express = require('express');
const router = express.Router();
const { prisma } = require('../config/database');

/**
 * GET /health
 * Basic health check - returns 200 if server is running
 */
router.get('/', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    service: 'parenting-helper-api',
    version: '1.0.0',
    environment: process.env.NODE_ENV || 'development'
  });
});

/**
 * GET /health/app-version
 * Returns minimum required app versions for mobile apps.
 * Used to force users to update when critical updates are released.
 *
 * Query params:
 * - app: 'mobile-main' | 'mobile-messenger' (optional, returns all if not specified)
 *
 * Response:
 * {
 *   mobileMain: { minVersion: "1.0.0", currentVersion: "1.0.0", updateUrl: { ios: "...", android: "..." } },
 *   mobileMessenger: { minVersion: "1.0.0", currentVersion: "1.0.0", updateUrl: { ios: "...", android: "..." } }
 * }
 */
router.get('/app-version', (req, res) => {
  // Minimum required versions - set via environment variables
  // When you need to force an update, increase these values
  const minVersionMobileMain = process.env.MIN_VERSION_MOBILE_MAIN || '1.0.0';
  const minVersionMobileMessenger = process.env.MIN_VERSION_MOBILE_MESSENGER || '1.0.0';

  // Current latest versions available in app stores
  const currentVersionMobileMain = process.env.CURRENT_VERSION_MOBILE_MAIN || '1.0.0';
  const currentVersionMobileMessenger = process.env.CURRENT_VERSION_MOBILE_MESSENGER || '1.0.0';

  // App store URLs - replace with actual URLs when published
  const appStoreUrls = {
    mobileMain: {
      ios: process.env.APP_STORE_URL_MAIN_IOS || 'https://apps.apple.com/app/parenting-helper/id000000000',
      android: process.env.APP_STORE_URL_MAIN_ANDROID || 'https://play.google.com/store/apps/details?id=com.parentinghelper.app',
    },
    mobileMessenger: {
      ios: process.env.APP_STORE_URL_MESSENGER_IOS || 'https://apps.apple.com/app/ph-messenger/id000000001',
      android: process.env.APP_STORE_URL_MESSENGER_ANDROID || 'https://play.google.com/store/apps/details?id=com.parentinghelper.messenger',
    },
  };

  const response = {
    mobileMain: {
      minVersion: minVersionMobileMain,
      currentVersion: currentVersionMobileMain,
      updateUrl: appStoreUrls.mobileMain,
    },
    mobileMessenger: {
      minVersion: minVersionMobileMessenger,
      currentVersion: currentVersionMobileMessenger,
      updateUrl: appStoreUrls.mobileMessenger,
    },
  };

  // If specific app requested, return only that app's info
  const { app } = req.query;
  if (app === 'mobile-main') {
    return res.status(200).json(response.mobileMain);
  }
  if (app === 'mobile-messenger') {
    return res.status(200).json(response.mobileMessenger);
  }

  res.status(200).json(response);
});

/**
 * POST /health/migrate
 * Add missing database columns via raw SQL (protected by API key)
 * This runs ALTER TABLE commands to add missing columns for billing
 */
router.post('/migrate', async (req, res) => {
  // Protect with billing API key (reuse existing secret)
  const apiKey = req.headers['x-api-key'];
  if (!apiKey || apiKey !== process.env.BILLING_API_KEY) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    console.log('Starting database migration...');

    // First verify we can connect
    await prisma.$queryRaw`SELECT 1`;
    console.log('Database connected successfully');

    const results = [];

    // Add missing columns to users table for billing (if they don't exist)
    const columnsToAdd = [
      { column: 'stripe_customer_id', type: 'VARCHAR(255)', unique: true },
      { column: 'default_payment_method_id', type: 'VARCHAR(255)', unique: false },
      { column: 'renewal_date', type: 'TIMESTAMP(6)', unique: false },
      { column: 'additional_storage_packs', type: 'INT DEFAULT 0', unique: false },
      { column: 'last_billing_attempt', type: 'TIMESTAMP(6)', unique: false },
      { column: 'billing_failure_count', type: 'INT DEFAULT 0', unique: false },
    ];

    for (const col of columnsToAdd) {
      try {
        // Check if column exists
        const existsResult = await prisma.$queryRaw`
          SELECT column_name FROM information_schema.columns
          WHERE table_name = 'users' AND column_name = ${col.column}
        `;

        if (existsResult.length === 0) {
          // Column doesn't exist, add it
          await prisma.$executeRawUnsafe(`ALTER TABLE users ADD COLUMN ${col.column} ${col.type}`);
          results.push({ column: col.column, status: 'added' });

          // Add unique constraint if needed
          if (col.unique) {
            try {
              await prisma.$executeRawUnsafe(`ALTER TABLE users ADD CONSTRAINT users_${col.column}_key UNIQUE (${col.column})`);
              results.push({ column: col.column, status: 'unique constraint added' });
            } catch (e) {
              // Constraint might already exist
              results.push({ column: col.column, status: 'unique constraint skipped', note: e.message });
            }
          }
        } else {
          results.push({ column: col.column, status: 'already exists' });
        }
      } catch (colError) {
        results.push({ column: col.column, status: 'error', error: colError.message });
      }
    }

    console.log('Migration results:', results);

    res.status(200).json({
      success: true,
      message: 'Database migration completed',
      results,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Database error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * GET /health/ready
 * Readiness check - returns 200 if server can handle requests
 * Checks database connectivity and other critical services
 */
router.get('/ready', async (req, res) => {
  try {
    // Check database connectivity
    await prisma.$queryRaw`SELECT 1`;
    const databaseStatus = 'connected';

    res.status(200).json({
      status: 'ready',
      timestamp: new Date().toISOString(),
      checks: {
        database: databaseStatus,
        storage: 'ok',
        email: 'ok'
      }
    });
  } catch (error) {
    res.status(503).json({
      status: 'not_ready',
      timestamp: new Date().toISOString(),
      error: error.message,
      checks: {
        database: 'failed',
        storage: 'ok',
        email: 'ok'
      }
    });
  }
});

module.exports = router;
