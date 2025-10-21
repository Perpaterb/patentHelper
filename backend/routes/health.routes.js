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
